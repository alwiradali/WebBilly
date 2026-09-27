-- 27 Sep 2026: reads. Cloudflare warned the account had used 79% of the
-- free plan's 5 million D1 rows read in a day. These let the busiest lookups
-- read the rows they need instead of whole tables.

-- /media/ looks a photograph up by its key (serveFeedImage, and the check on
-- originals) on every edge-cache miss; without this each one read the whole
-- media table.
CREATE INDEX IF NOT EXISTS idx_media_key ON media(key_orig);

-- the daily clear-out of events older than 90 days (pruneEvents)
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at);

-- "has this visitor already been counted today": one visitor's rows, not
-- every row of that kind today (publicEvent, logNotFound)
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_hash, name, at);
