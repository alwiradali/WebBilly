-- Megacity Studio — initial schema (D1 / SQLite).
-- Apply remotely:  npx wrangler d1 migrations apply megacity --remote
-- Apply locally:   npx wrangler d1 migrations apply megacity --local --config wrangler.dev.toml
--
-- Conventions: ids are short random strings (listings use their public slug);
-- timestamps are ISO-8601 UTC text; JSON columns end in _json.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner','staff')),
  pass_hash     TEXT NOT NULL,                 -- pbkdf2$<iters>$<salt b64>$<hash b64>
  disabled      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,           -- sha256 of the cookie's secret part
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  last_seen_at TEXT,
  ip           TEXT,
  ua           TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exp  ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_tokens (                 -- invites + password resets
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('invite','reset')),
  email      TEXT NOT NULL COLLATE NOCASE,
  role       TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_email ON auth_tokens(email, kind);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,                -- login:ip:1.2.3.4 | login:email:x | ai:user:<id> | form:ip:<ip>
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id               TEXT PRIMARY KEY,            -- public slug; also the billy360 tour id
  source           TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','tenninety')),
  external_id      TEXT,                        -- 10ninety property id once synced
  ref              TEXT,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','let_agreed','let','withdrawn')),
  hidden           INTEGER NOT NULL DEFAULT 0,  -- keep off the public site even if live in the source
  deleted_at       TEXT,                        -- soft delete ("Bin")
  title            TEXT NOT NULL,
  headline         TEXT,
  type             TEXT,
  let_type         TEXT,
  furnishing       TEXT,
  rent_pcm         INTEGER,
  deposit          INTEGER,
  bills            TEXT,
  bills_note       TEXT,
  availability     TEXT,
  available_from   TEXT,
  min_term         TEXT,
  council_tax_band TEXT,
  epc_rating       TEXT,
  bedrooms         INTEGER,
  bathrooms        INTEGER,                     -- derived count from home_json for filtering / JSON-LD
  receptions       INTEGER,                     -- derived count from home_json
  home_json        TEXT NOT NULL DEFAULT '{}',  -- {bathrooms:[{subtype}], receptions:[{subtype}], kitchen:{subtype}|null, garden:{subtype}|null, driveway:{subtype}|null}
  parking_spaces   INTEGER,
  parking_note     TEXT,                        -- "where to park" when parking_spaces = 0
  pets             TEXT,
  hmo_licensed     INTEGER,
  floor_area_sqft  INTEGER,
  address_1        TEXT,
  address_2        TEXT,
  town             TEXT,
  postcode         TEXT,
  area             TEXT,
  lat              REAL,
  lng              REAL,
  summary          TEXT,
  description      TEXT,                        -- paragraphs separated by blank lines
  features_json    TEXT NOT NULL DEFAULT '[]',
  cover_media_id   TEXT,
  seo_title        TEXT,
  seo_description  TEXT,
  external_json    TEXT,                        -- raw source record for synced listings
  synced_at        TEXT,
  published_at     TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_by       TEXT
);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source, external_id);

CREATE TABLE IF NOT EXISTS media (
  id            TEXT PRIMARY KEY,
  listing_id    TEXT REFERENCES listings(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('photo','pano','video','pdf')),
  role          TEXT NOT NULL DEFAULT 'gallery', -- gallery | cover | epc | floorplan | tour | og | page
  room_label    TEXT,                            -- "Kitchen", "Bedroom 2" — which room this shows
  key_orig      TEXT NOT NULL,                   -- R2 keys
  key_large     TEXT,
  key_thumb     TEXT,
  key_pano      TEXT,
  mime          TEXT,
  width         INTEGER,
  height        INTEGER,
  bytes         INTEGER,
  alt           TEXT,
  caption       TEXT,
  sort          INTEGER NOT NULL DEFAULT 0,
  phash         TEXT,
  luma          INTEGER,
  sharp         INTEGER,
  ai_label      TEXT,
  ai_confidence REAL,
  created_at    TEXT NOT NULL,
  created_by    TEXT
);
CREATE INDEX IF NOT EXISTS idx_media_listing ON media(listing_id, role, sort);

CREATE TABLE IF NOT EXISTS tours (
  listing_id   TEXT PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  draft_json   TEXT NOT NULL,                    -- billy360 tour JSON; panoramas by /media URL, never base64
  live_json    TEXT,
  version      INTEGER NOT NULL DEFAULT 1,       -- optimistic concurrency
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live')),
  health_score INTEGER,
  room_count   INTEGER,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT,
  live_at      TEXT
);

CREATE TABLE IF NOT EXISTS enquiries (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL,
  source        TEXT NOT NULL,                   -- viewing | contact | valuation | register | tour | maintenance
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','handled','spam')),
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  listing_id    TEXT,
  message       TEXT,
  preferred_day TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  referrer      TEXT,
  landing_url   TEXT,
  handled_by    TEXT,
  handled_at    TEXT,
  note          TEXT
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_listing ON enquiries(listing_id);

CREATE TABLE IF NOT EXISTS pages (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,          -- served at /templates/megacity-<slug>
  kind            TEXT NOT NULL CHECK (kind IN ('area','landing','guide')),
  title           TEXT NOT NULL,
  seo_title       TEXT,
  seo_description TEXT,
  hero_media_id   TEXT,
  body_json       TEXT NOT NULL DEFAULT '[]',
  faq_json        TEXT NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live')),
  published_at    TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);

CREATE TABLE IF NOT EXISTS backlinks (
  id              TEXT PRIMARY KEY,
  source_url      TEXT NOT NULL,
  target_path     TEXT NOT NULL,
  anchor          TEXT,
  contact         TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','requested','live','lost')),
  last_checked_at TEXT,
  last_result     TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,                   -- brand, notify_emails, links_10ninety, tour_gate_score, ga4_id, meta_pixel_id, gsc_verification, consent_text
  value      TEXT NOT NULL,                      -- JSON
  updated_at TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id      TEXT PRIMARY KEY,
  at      TEXT NOT NULL,
  kind    TEXT NOT NULL,
  title   TEXT NOT NULL,
  body    TEXT,
  link    TEXT,
  user_id TEXT,
  read_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications ON notifications(read_at, at DESC);

CREATE TABLE IF NOT EXISTS events (                      -- first-party analytics: listing_view, tour_open, enquiry, published
  id           TEXT PRIMARY KEY,
  at           TEXT NOT NULL,
  name         TEXT NOT NULL,
  listing_id   TEXT,
  session_hash TEXT,
  meta_json    TEXT
);
CREATE INDEX IF NOT EXISTS idx_events ON events(name, at DESC);

CREATE TABLE IF NOT EXISTS audit (
  id          TEXT PRIMARY KEY,
  at          TEXT NOT NULL,
  user_id     TEXT,
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   TEXT,
  detail_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit ON audit(at DESC);

CREATE TABLE IF NOT EXISTS ai_usage (
  id            TEXT PRIMARY KEY,
  at            TEXT NOT NULL,
  user_id       TEXT,
  route         TEXT,
  model         TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  ms            INTEGER,
  ok            INTEGER
);
