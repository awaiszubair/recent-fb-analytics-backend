ALTER TABLE page_insights
ALTER COLUMN page_id TYPE TEXT USING page_id::TEXT;

UPDATE page_insights pi
SET page_id = cp.fb_page_id
FROM connected_pages cp
WHERE pi.page_id = cp.id::TEXT;

ALTER TABLE post_insights
ALTER COLUMN post_id TYPE TEXT USING post_id::TEXT;

UPDATE post_insights poi
SET post_id = p.fb_post_id
FROM posts p
WHERE poi.post_id = p.id::TEXT;
