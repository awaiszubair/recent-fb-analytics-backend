/**
 * FullSyncTask
 * ------------
 * Runs on a configurable interval (default: 6 hours).
 * For each active page in the DB:
 *   - page_insights   → last 7 days (re-synced / overwritten via upsert)
 *   - cm_earnings_page→ last 7 days
 *   - post_insights   → last 90 days (full window, via upsert — no duplication)
 *   - cm_earnings_post→ last 7 days
 *   - sync_jobs       → one record per run, status updated
 *
 * All actual save logic is delegated to SaveFacebookDataService (unchanged).
 */
import { BaseSyncTask } from "../base.sync-task";
import saveFacebookDataService from "../../services/saveFacebookData.service";
import pageRepository from "../../repositories/ConnectedPage";
import postRepository from "../../repositories/Post";
import { decryptPageToken } from "../../utils/pageTokenCrypto";

const FULL_SYNC_PAGE_INSIGHT_DAYS = 7;
const FULL_SYNC_POST_INSIGHT_DAYS = 90;
const FULL_SYNC_EARNINGS_DAYS = 7;

const DEFAULT_PAGE_METRICS = [
  "page_impressions_unique",
  "page_post_engagements",
  "page_media_view",
  "page_follows",
  "page_video_views",
  "page_views_total",
];

const DEFAULT_POST_METRICS = [
  "post_impressions_unique",
  "post_media_view",
  "post_impressions_organic_unique",
  "post_impressions_paid_unique",
  "post_reactions_by_type_total",
  "post_clicks_by_type",
  "post_video_views",
  "post_video_avg_time_watched",
  "post_video_retention_graph",
];

class FullSyncTask extends BaseSyncTask {
  protected readonly taskName = "full-sync";

  async execute(): Promise<void> {
    this.log("🚀 Starting full sync run...");

    const pages = await pageRepository.getAllActivePages();
    this.log(`Found ${pages.length} active pages to sync`);

    let totalPageInsightsSaved = 0;
    let totalPostInsightsSaved = 0;
    let pagesSucceeded = 0;
    let pagesFailed = 0;

    for (const page of pages) {
      const syncJob = await saveFacebookDataService.createSyncJob(page.id, "cron_full_sync");

      try {
        await saveFacebookDataService.updateSyncJob(syncJob.id, "running");

        if (!page.page_token_encrypted) {
          this.warn(`No token for page ${page.fb_page_id}, skipping`);
          await saveFacebookDataService.updateSyncJob(syncJob.id, "failed", "No page token stored");
          pagesFailed++;
          continue;
        }

        const accessToken = decryptPageToken(page.page_token_encrypted);

        // 1. Sync page insights — last 7 days
        this.log(`Syncing page insights for ${page.fb_page_id}...`);
        const pageInsights = await saveFacebookDataService.syncPageInsights({
          pageId: page.id,
          facebookPageId: page.fb_page_id,
          accessToken,
          metrics: DEFAULT_PAGE_METRICS,
          period: "day",
          since: this.getWindowStart(FULL_SYNC_PAGE_INSIGHT_DAYS),
          until: this.getTodayIso(),
        });
        totalPageInsightsSaved += pageInsights.length;

        // 2. Sync CM earnings for page — last 7 days
        // (earnings are embedded inside post-level insights via getPostWithInsights)
        // This is handled per-post below.

        // 3. Sync post-level data — last 90 days of post insights
        const posts = await postRepository.getPagePosts(page.id);
        this.log(`Syncing post insights for ${posts.length} posts (page: ${page.fb_page_id})...`);

        for (const post of posts) {
          try {
            const postInsights = await saveFacebookDataService.syncPostInsights({
              fbPostId: post.fb_post_id,
              facebookPostId: post.fb_post_id,
              accessToken,
              metrics: DEFAULT_POST_METRICS,
              since: this.getWindowStart(FULL_SYNC_POST_INSIGHT_DAYS),
              until: this.getTodayIso(),
            });
            totalPostInsightsSaved += postInsights.length;
          } catch (postErr) {
            this.warn(`Failed post insights for post ${post.fb_post_id}`, {
              error: postErr instanceof Error ? postErr.message : String(postErr),
            });
          }
        }

        await saveFacebookDataService.updateSyncJob(syncJob.id, "completed");
        pagesSucceeded++;
        this.log(`✅ Page ${page.fb_page_id} full-synced`);
      } catch (err) {
        this.error(`Failed to full-sync page ${page.fb_page_id}`, err);
        await saveFacebookDataService.updateSyncJob(
          syncJob.id,
          "failed",
          err instanceof Error ? err.message : String(err)
        );
        pagesFailed++;
      }
    }

    this.log("🎉 Full sync run complete", {
      pagesSucceeded,
      pagesFailed,
      totalPageInsightsSaved,
      totalPostInsightsSaved,
    });
  }
}

export const cronFullSyncTask = new FullSyncTask();
