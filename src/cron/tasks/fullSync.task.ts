/**
 * FullSyncTask
 * ------------
 * Runs on a configurable interval (default: 6 hours).
 * For each active page in the DB:
 *   - page_insights   -> last 7 days
 *   - cm_earnings_page-> last 7 days
 *   - post_insights   -> last 90 days
 *   - cm_earnings_post-> last 7 days
 *   - sync_jobs       -> one record per run
 */
import { BaseSyncTask } from "../base.sync-task";
import saveFacebookDataService from "../../services/saveFacebookData.service";
import insightsService from "../../services/insights.service";
import pageRepository from "../../repositories/ConnectedPage";
import postRepository from "../../repositories/Post";
import { decryptPageToken } from "../../utils/pageTokenCrypto";
import type { FacebookPost } from "../../types/facebook";

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
    let totalPageEarningsSaved = 0;
    let totalPostEarningsSaved = 0;
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
        const syncUntil = this.getTodayIso();
        const pageWindowStart = this.getWindowStart(FULL_SYNC_PAGE_INSIGHT_DAYS);
        const earningsWindowStart = this.getWindowStart(FULL_SYNC_EARNINGS_DAYS);
        const postWindowStart = this.getWindowStart(FULL_SYNC_POST_INSIGHT_DAYS);

        this.log(`Syncing page insights for ${page.fb_page_id}...`);
        const pageInsights = await saveFacebookDataService.syncPageInsights({
          pageId: page.id,
          facebookPageId: page.fb_page_id,
          accessToken,
          metrics: DEFAULT_PAGE_METRICS,
          period: "day",
          since: pageWindowStart,
          until: syncUntil,
        });
        totalPageInsightsSaved += pageInsights.length;

        const posts = await postRepository.getPagePosts(page.id);
        this.log(`Syncing post insights for ${posts.length} posts (page: ${page.fb_page_id})...`);

        let nextPageUrl: string | undefined;
        const allFbPosts: FacebookPost[] = [];
        let pageNum = 1;
        let postsSaved = 0;
        let postsQueued = 0;

        do {
          const postsPage = await insightsService.getPagePostsPage(page.fb_page_id, {
            access_token: accessToken,
            limit: 100,
            since: postWindowStart,
            until: syncUntil,
            nextPageUrl,
          });

          const fbPosts = postsPage.data.filter((rawPost): rawPost is FacebookPost => Boolean(rawPost?.id));
          allFbPosts.push(...fbPosts);
          this.log(`Fetched batch ${pageNum} (${fbPosts.length} posts) from Facebook for page ${page.fb_page_id}`);

          const postJobs: Array<{ pageId: string; postId: string; fbPostId: string; accessToken: string }> = [];

          for (const fbPost of fbPosts) {
            const syncedPost = await saveFacebookDataService.syncPost({
              page_id: page.fb_page_id,
              fb_post_id: fbPost.id,
              message: fbPost.message,
              type: fbPost.status_type,
              permalink: fbPost.permalink_url,
              created_time: fbPost.created_time,
            });

            postsSaved += 1;
            postJobs.push({
              pageId: page.id,
              postId: syncedPost.id,
              fbPostId: syncedPost.fb_post_id,
              accessToken,
            });
          }

          if (postJobs.length > 0) {
            await Promise.all(
              postJobs.map(async (job) => {
                const postInsights = await saveFacebookDataService.syncPostInsights({
                  fbPostId: job.fbPostId,
                  facebookPostId: job.fbPostId,
                  accessToken: job.accessToken,
                  metrics: DEFAULT_POST_METRICS,
                });
                totalPostInsightsSaved += postInsights.length;

                const postEarningsSaved = await saveFacebookDataService.syncPostCMEarningsForWindow(
                  job.fbPostId,
                  job.accessToken,
                  earningsWindowStart,
                  syncUntil
                );
                totalPostEarningsSaved += postEarningsSaved;
              })
            );

            postsQueued += postJobs.length;
          }

          nextPageUrl = postsPage.paging?.next;
          pageNum++;
        } while (nextPageUrl);

        const pageEarningsSaved = await saveFacebookDataService.syncPageCMEarningsForWindow(
          page.fb_page_id,
          accessToken,
          earningsWindowStart,
          syncUntil,
          allFbPosts
        );
        totalPageEarningsSaved += pageEarningsSaved;

        await saveFacebookDataService.updateSyncJob(syncJob.id, "completed");
        pagesSucceeded++;
        this.log(`✅ Page ${page.fb_page_id} full-synced`);
        this.log(`📈 Page summary: ${postsSaved} posts saved, ${postsQueued} post insights queued.`);
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
      totalPageEarningsSaved,
      totalPostEarningsSaved,
    });
  }
}

export const cronFullSyncTask = new FullSyncTask();
