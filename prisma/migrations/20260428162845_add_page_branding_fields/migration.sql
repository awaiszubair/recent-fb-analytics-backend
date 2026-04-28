-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "company" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connected_pages" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "fb_page_id" TEXT NOT NULL,
    "page_name" TEXT,
    "page_token_encrypted" TEXT,
    "picture_url" TEXT,
    "category" TEXT,
    "fan_count" BIGINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connected_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "page_id" TEXT NOT NULL,
    "fb_post_id" TEXT NOT NULL,
    "message" TEXT,
    "type" TEXT,
    "full_picture" TEXT,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "shares_count" INTEGER NOT NULL DEFAULT 0,
    "permalink" TEXT,
    "created_time" TIMESTAMPTZ(6),
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_insights" (
    "id" UUID NOT NULL,
    "page_id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_value" JSONB,
    "period" TEXT,
    "end_time" TIMESTAMPTZ(6),
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_insights" (
    "id" UUID NOT NULL,
    "post_id" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "metric_value" JSONB,
    "period" TEXT,
    "end_time" TIMESTAMPTZ(6),
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cm_earnings_post" (
    "id" UUID NOT NULL,
    "post_id" TEXT NOT NULL,
    "earnings_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "approximate_earnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period" TEXT,
    "end_time" TIMESTAMPTZ(6),
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cm_earnings_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cm_earnings_page" (
    "id" UUID NOT NULL,
    "page_id" TEXT NOT NULL,
    "earnings_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "approximate_earnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "content_type_breakdown" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period" TEXT,
    "end_time" TIMESTAMPTZ(6),
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cm_earnings_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "third_party_data" (
    "id" UUID NOT NULL,
    "page_id" UUID,
    "post_id" UUID,
    "data_type" TEXT NOT NULL,
    "value" JSONB,
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "third_party_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "error_log" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_user_id_key" ON "partners"("user_id");

-- CreateIndex
CREATE INDEX "connected_pages_partner_id_idx" ON "connected_pages"("partner_id");

-- CreateIndex
CREATE INDEX "connected_pages_fb_page_id_idx" ON "connected_pages"("fb_page_id");

-- CreateIndex
CREATE UNIQUE INDEX "connected_pages_partner_id_fb_page_id_key" ON "connected_pages"("partner_id", "fb_page_id");

-- CreateIndex
CREATE INDEX "posts_page_id_idx" ON "posts"("page_id");

-- CreateIndex
CREATE INDEX "posts_fb_post_id_idx" ON "posts"("fb_post_id");

-- CreateIndex
CREATE UNIQUE INDEX "posts_page_id_fb_post_id_key" ON "posts"("page_id", "fb_post_id");

-- CreateIndex
CREATE INDEX "page_insights_page_id_idx" ON "page_insights"("page_id");

-- CreateIndex
CREATE INDEX "page_insights_page_id_metric_name_idx" ON "page_insights"("page_id", "metric_name");

-- CreateIndex
CREATE INDEX "page_insights_page_id_metric_name_period_end_time_idx" ON "page_insights"("page_id", "metric_name", "period", "end_time");

-- CreateIndex
CREATE INDEX "page_insights_end_time_idx" ON "page_insights"("end_time");

-- CreateIndex
CREATE INDEX "post_insights_post_id_idx" ON "post_insights"("post_id");

-- CreateIndex
CREATE INDEX "post_insights_post_id_metric_name_idx" ON "post_insights"("post_id", "metric_name");

-- CreateIndex
CREATE INDEX "post_insights_post_id_metric_name_period_end_time_idx" ON "post_insights"("post_id", "metric_name", "period", "end_time");

-- CreateIndex
CREATE INDEX "post_insights_end_time_idx" ON "post_insights"("end_time");

-- CreateIndex
CREATE INDEX "cm_earnings_post_post_id_idx" ON "cm_earnings_post"("post_id");

-- CreateIndex
CREATE INDEX "cm_earnings_post_post_id_period_end_time_idx" ON "cm_earnings_post"("post_id", "period", "end_time");

-- CreateIndex
CREATE INDEX "cm_earnings_page_page_id_idx" ON "cm_earnings_page"("page_id");

-- CreateIndex
CREATE INDEX "cm_earnings_page_page_id_period_end_time_idx" ON "cm_earnings_page"("page_id", "period", "end_time");

-- CreateIndex
CREATE INDEX "third_party_data_page_id_idx" ON "third_party_data"("page_id");

-- CreateIndex
CREATE INDEX "third_party_data_post_id_idx" ON "third_party_data"("post_id");

-- CreateIndex
CREATE INDEX "third_party_data_data_type_idx" ON "third_party_data"("data_type");

-- CreateIndex
CREATE INDEX "sync_jobs_page_id_idx" ON "sync_jobs"("page_id");

-- CreateIndex
CREATE INDEX "sync_jobs_page_id_job_type_idx" ON "sync_jobs"("page_id", "job_type");

-- CreateIndex
CREATE INDEX "sync_jobs_page_id_job_type_created_at_idx" ON "sync_jobs"("page_id", "job_type", "created_at");
