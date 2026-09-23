-- Photographs that stay on 10ninety's server.
--
-- Walid's property photos are not copied into his R2 bucket: he uploads them
-- once, to 10ninety, and that is where they live. Only the 360 panoramas are
-- stored here, because those are shot for this website and exist nowhere else.
--
-- So a synced photo is a media row with no object behind it: key_orig is a
-- synthetic key of the shape l/<listing>/m_<id>/feed.jpg, and source_url is
-- where the bytes actually are. The /media/ route serves it by fetching that
-- URL and caching the reply at Cloudflare's edge.
--
-- The edge cache is not optional. 10ninety sends "cache-control: no-cache,
-- no-store" with every image, so without it each photograph would be a fresh
-- round trip to their server for every visitor -- around a second each, twenty
-- of them on a property page.

ALTER TABLE media ADD COLUMN source_url TEXT;

-- Finding every photo belonging to a feed listing, and finding the row for a
-- key the /media/ route has been asked for, are the two reads this adds.
CREATE INDEX IF NOT EXISTS media_source ON media(source_url) WHERE source_url IS NOT NULL;
