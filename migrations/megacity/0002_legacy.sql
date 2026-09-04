-- The old website's /property/<id>/ number for each listing, so those
-- addresses redirect to the right page on the new domain. The 10ninety sync
-- sets it from external_id; imports read it from the old page link.
ALTER TABLE listings ADD COLUMN legacy_id TEXT;
CREATE INDEX IF NOT EXISTS idx_listings_legacy ON listings(legacy_id);
