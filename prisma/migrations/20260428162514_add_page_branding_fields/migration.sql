-- AlterTable
ALTER TABLE "connected_pages" ADD COLUMN     "category" TEXT,
ADD COLUMN     "picture_url" TEXT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "comments_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "full_picture" TEXT,
ADD COLUMN     "shares_count" INTEGER NOT NULL DEFAULT 0;
