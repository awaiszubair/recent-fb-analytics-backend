-- AlterTable: Add missing branding columns to connected_pages
ALTER TABLE "connected_pages" ADD COLUMN "picture_url" TEXT;
ALTER TABLE "connected_pages" ADD COLUMN "category" TEXT;

-- AlterTable: Add missing engagement columns to posts
ALTER TABLE "posts" ADD COLUMN "full_picture" TEXT;
ALTER TABLE "posts" ADD COLUMN "comments_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN "shares_count" INTEGER NOT NULL DEFAULT 0;
