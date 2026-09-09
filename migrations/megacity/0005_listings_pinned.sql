-- Properties Walid wants on the website permanently.
--
-- The 10ninety sync does not exist yet, so nothing can remove a listing today.
-- It will exist once the Web API key arrives, and the rule it must obey needs
-- to be in the data before then, not remembered later: a pinned listing is
-- never deleted, hidden, unpublished or overwritten by a sync. The adapter
-- reads this column; the Studio sets it with the "Keep on the website" toggle.
ALTER TABLE listings ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_listings_pinned ON listings(pinned) WHERE pinned = 1;
