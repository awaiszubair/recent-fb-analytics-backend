ALTER TABLE posts
ALTER COLUMN page_id TYPE TEXT USING page_id::TEXT;

UPDATE posts p
SET page_id = cp.fb_page_id
FROM connected_pages cp
WHERE p.page_id = cp.id::TEXT;
