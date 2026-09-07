-- The draft version that was copied to live_json at the last publish, so the
-- Studio can say "Changes not live" when version has moved past it.
ALTER TABLE tours ADD COLUMN live_version INTEGER;
