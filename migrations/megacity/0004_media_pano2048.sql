-- The 2048-wide panorama the browser sends beside pano4096.jpg, so phones
-- download a quarter of the bytes (billy360 engine picks it by canvas size).
ALTER TABLE media ADD COLUMN key_pano2048 TEXT;
