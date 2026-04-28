-- Safe AlterTable: Add columns only if they don't exist
DO $$ 
BEGIN 
    -- connected_pages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='connected_pages' AND column_name='picture_url') THEN
        ALTER TABLE "connected_pages" ADD COLUMN "picture_url" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='connected_pages' AND column_name='category') THEN
        ALTER TABLE "connected_pages" ADD COLUMN "category" TEXT;
    END IF;

    -- posts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='full_picture') THEN
        ALTER TABLE "posts" ADD COLUMN "full_picture" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='comments_count') THEN
        ALTER TABLE "posts" ADD COLUMN "comments_count" INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='shares_count') THEN
        ALTER TABLE "posts" ADD COLUMN "shares_count" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;
