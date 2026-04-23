/**
 * IncrementalSyncTask
 * -------------------
 * Runs once daily (default: 1:00 AM).
 * For each active page, for each tracked metric:
 *   1. Check if yesterday's row already exists in the DB
 *   2. If it does exist, skip
 *   3. If it does not exist, fetch from Facebook and append
 *
 * Tables covered:
 *   - page_insights
 *   - post_insights
 *   - cm_earnings_page
 *   - cm_earnings_post
 *   - sync_jobs
 */
import { BaseSyncTask } from "../base.sync-task";
import saveFacebookDataService from "../../services/saveFacebookData.service";
import pageRepository from "../../repositories/ConnectedPage";
import postRepository from "../../repositories/Post";
import pageInsightsRepository from "../../repositories/PageInsights";
import postInsightsRepository from "../../repositories/PostInsights";
import earningsRepository from "../../repositories/Earnings";
import { decryptPageToken } from "../../utils/pageTokenCrypto";

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

class IncrementalSyncTask extends BaseSyncTask {
  protected readonly taskName = "incremental-sync";

  async execute(): Promise<void> {
    this.log("🚀 Starting incremental sync run...");

    const yesterday = this.getYesterday();
    const since = this.getYesterdayIso();
    const until = this.getTodayIso();

    const pages = await pageRepository.getAllActivePages();
    this.log(`Found ${pages.length} active pages`, { date: yesterday.toISOString().split("T")[0] });

    let pageInsightsAppended = 0;
    let postInsightsAppended = 0;
    let earningsPageAppended = 0;
    let earningsPostAppended = 0;
    let pagesSucceeded = 0;
    let pagesFailed = 0;

    for (const page of pages) {
      const syncJob = await saveFacebookDataService.createSyncJob(page.id, "cron_incremental_sync");

      try {
        await saveFacebookDataService.updateSyncJob(syncJob.id, "running");

        if (!page.page_token_encrypted) {
          this.warn(`No token for page ${page.fb_page_id}, skipping`);
          await saveFacebookDataService.updateSyncJob(syncJob.id, "failed", "No page token stored");
          pagesFailed++;
          continue;
        }

        const accessToken = decryptPageToken(page.page_token_encrypted);

        for (const metric of DEFAULT_PAGE_METRICS) {
          const existing = await pageInsightsRepository.findByMetricAndDate(
            page.fb_page_id,
            metric,
            yesterday
          );

          if (existing) {
            continue;
          }

          this.log(`Appending missing page insight: ${metric} for ${page.fb_page_id}`);
          const saved = await saveFacebookDataService.syncPageInsights({
            pageId: page.id,
            facebookPageId: page.fb_page_id,
            accessToken,
            metrics: [metric],
            period: "day",
            since,
            until,
          });
          pageInsightsAppended += saved.length;
        }

        const posts = await postRepository.getPagePosts(page.id);

        const existingPageEarnings = await earningsRepository.findPageEarningsByDate(
          page.fb_page_id,
          yesterday
        );

        if (!existingPageEarnings) {
          this.log(`Appending missing page earnings for ${page.fb_page_id}`);
          const saved = await saveFacebookDataService.syncPageCMEarningsForWindow(
            page.fb_page_id,
            accessToken,
            since,
            until,
            posts
          );
          earningsPageAppended += saved;
        }

        for (const post of posts) {
          try {
            const existingPostInsights = await postInsightsRepository.getPostInsights(post.fb_post_id);
            const existingMetrics = new Set(existingPostInsights.map((insight) => insight.metric_name));

            for (const metric of DEFAULT_POST_METRICS) {
              if (existingMetrics.has(metric)) {
                continue;
              }

              this.log(`Appending missing post insight: ${metric} for ${post.fb_post_id}`);
              const saved = await saveFacebookDataService.syncPostInsights({
                fbPostId: post.fb_post_id,
                facebookPostId: post.fb_post_id,
                accessToken,
                metrics: [metric],
              });
              postInsightsAppended += saved.length;
            }

            const existingPostEarnings = await earningsRepository.findPostEarningsByDate(
              post.fb_post_id,
              yesterday
            );

            if (!existingPostEarnings) {
              this.log(`Appending missing post earnings for ${post.fb_post_id}`);
              const saved = await saveFacebookDataService.syncPostCMEarningsForWindow(
                post.fb_post_id,
                accessToken,
                since,
                until
              );
              earningsPostAppended += saved;
            }
          } catch (postErr) {
            this.warn(`Failed incremental sync for post ${post.fb_post_id}`, {
              error: postErr instanceof Error ? postErr.message : String(postErr),
            });
          }
        }

        await saveFacebookDataService.updateSyncJob(syncJob.id, "completed");
        pagesSucceeded++;
        this.log(`✅ Page ${page.fb_page_id} incremental-synced`);
      } catch (err) {
        this.error(`Failed incremental sync for page ${page.fb_page_id}`, err);
        await saveFacebookDataService.updateSyncJob(
          syncJob.id,
          "failed",
          err instanceof Error ? err.message : String(err)
        );
        pagesFailed++;
      }
    }

    this.log("🎉 Incremental sync run complete", {
      pagesSucceeded,
      pagesFailed,
      pageInsightsAppended,
      postInsightsAppended,
      earningsPageAppended,
      earningsPostAppended,
    });
  }
}

export const cronIncrementalSyncTask = new IncrementalSyncTask();
