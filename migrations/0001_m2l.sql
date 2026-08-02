-- Mumbai2London — enquiries, bookings and admin replies
CREATE TABLE IF NOT EXISTS enquiries (
  id           TEXT PRIMARY KEY,
  created_at   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new',   -- new | quoted | confirmed | declined
  event_type   TEXT,
  event_date   TEXT,                          -- YYYY-MM-DD
  event_time   TEXT,                          -- HH:MM
  hours        TEXT,
  location     TEXT,
  addons       TEXT,                          -- comma separated
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT NOT NULL,
  notes        TEXT,
  source       TEXT DEFAULT 'form',           -- form | chat
  reply        TEXT,
  replied_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_enq_date   ON enquiries(event_date);
CREATE INDEX IF NOT EXISTS idx_enq_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enq_created ON enquiries(created_at DESC);
