import { BaseService } from "../../core/base.service";
import postRepository from "../../repositories/Post";
import insightsService from "../insights.service";
import { facebookSyncQueue } from "../../queues/facebookSync.queue";
import type {
  InitialConnectionSyncResult,
  PageSyncJobPayload,
  PageSyncJobResult,
  PostSyncJobPayload,
  PostSyncJobResult,
} from "../../types/facebookSync";
import type { SyncJobEntity } from "../../types/domain";
import type { FacebookPage, FacebookPost } from "../../types/facebook";
import partnerSyncService from "./partner.sync.service";
import pageSyncService from "./page.sync.service";
import postSyncService from "./post.sync.service";
import syncJobService from "./sync-job.service";
import {
  DEFAULT_PAGE_METRICS,
  DEFAULT_POST_FETCH_LIMIT,
  DEFAULT_POST_METRICS,
  DEFAULT_POST_WRITE_CHUNK,
  DEFAULT_SYNC_WINDOW_DAYS,
} from "../facebookSync.presets";

export class FacebookSyncOrchestrator extends BaseService {
  constructor() {
    super("FacebookSyncOrchestrator");
  }

  async initialConnectionSync(accessToken: string): Promise<InitialConnectionSyncResult> {
    return this.run("initialConnectionSync", async () => {
      const partner = await partnerSyncService.syncPartner(accessToken);
      const pagesResponse = await insightsService.getUserPages({ access_token: accessToken });
      const queuedPages: InitialConnectionSyncResult["queuedPages"] = [];
      const errors: InitialConnectionSyncResult["errors"] = [];

      await Promise.all(
        (pagesResponse.data as FacebookPage[]).map(async (fbPage) => {
          if (!fbPage?.id) {
            return;
          }

          try {
            const job = await facebookSyncQueue.enqueuePageSync({
              partnerId: partner.id,
              accessToken,
              facebookPage: fbPage,
              syncWindowDays: DEFAULT_SYNC_WINDOW_DAYS,
              postBatchSize: DEFAULT_POST_FETCH_LIMIT,
              postWriteChunkSize: DEFAULT_POST_WRITE_CHUNK,
              pageMetrics: DEFAULT_PAGE_METRICS,
              postMetrics: DEFAULT_POST_METRICS,
            });

            queuedPages.push({
              fbPageId: fbPage.id,
              pageName: fbPage.name || null,
              jobId: job.id ? String(job.id) : null,
            });
          } catch (error) {
            errors.push({
              pageId: fbPage.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );

      return {
        partner,
        pagesQueued: queuedPages.length,
        queuedPages,
        errors,
      };
    });
  }

  async processPageSyncJob(payload: PageSyncJobPayload): Promise<PageSyncJobResult> {
    return this.run("processPageSyncJob", async () => {
      const fbPage = payload.facebookPage;
      const accessToken = fbPage.access_token || payload.accessToken;
      const syncUntil = new Date().toISOString();
      let syncJob: SyncJobEntity | null = null;

      console.log(`[facebook-sync] 🚀 Starting full sync for page: ${fbPage.name || fbPage.id} (${fbPage.id})`);

      try {
        const syncedPage = await pageSyncService.syncPage({
          partner_id: payload.partnerId,
          fb_page_id: fbPage.id,
          page_name: fbPage.name || null,
          page_token_encrypted: fbPage.access_token || null,
          fan_count: fbPage.fan_count || 0,
          is_active: true,
          last_synced_at: new Date(),
        });

        syncJob = await syncJobService.createSyncJob(syncedPage.id, "page_sync");
        await syncJobService.updateSyncJob(syncJob.id, "running");

        console.log(`[facebook-sync] 📊 Fetching page insights for ${fbPage.id}...`);
        const pageInsights = await pageSyncService.syncPageInsights({
          pageId: syncedPage.id,
          facebookPageId: fbPage.id,
          accessToken,
          metrics: payload.pageMetrics || DEFAULT_PAGE_METRICS,
          period: "day",
          since: this.getWindowStart(payload.syncWindowDays ?? DEFAULT_SYNC_WINDOW_DAYS),
          until: syncUntil,
        });
        console.log(`[facebook-sync] ✅ Saved ${pageInsights.length} page insights for ${fbPage.id}`);

        let postsSaved = 0;
        let postsQueued = 0;
        let nextPageUrl: string | undefined;
        const allFbPosts: FacebookPost[] = [];

        console.log(`[facebook-sync] 📝 Starting to fetch posts for page ${fbPage.id}...`);
        let pageNum = 1;

        do {
          const postsPage = await insightsService.getPagePostsPage(fbPage.id, {
            access_token: accessToken,
            limit: payload.postBatchSize ?? DEFAULT_POST_FETCH_LIMIT,
            since: this.getWindowStart(payload.syncWindowDays ?? DEFAULT_SYNC_WINDOW_DAYS),
            until: syncUntil,
            nextPageUrl,
          });

          const postJobs: PostSyncJobPayload[] = [];
          const fbPosts = postsPage.data.filter((rawPost): rawPost is FacebookPost => Boolean(rawPost?.id));
          allFbPosts.push(...fbPosts);
          console.log(`[facebook-sync] 🔄 Fetched batch ${pageNum} (${fbPosts.length} posts) from Facebook for page ${fbPage.id}`);

          const postWriteChunkSize = payload.postWriteChunkSize ?? DEFAULT_POST_WRITE_CHUNK;

          for (let index = 0; index < fbPosts.length; index += postWriteChunkSize) {
            const chunk = fbPosts.slice(index, index + postWriteChunkSize);

            for (const fbPost of chunk) {
              const syncedPost = await postSyncService.syncPost({
                page_id: fbPage.id,
                fb_post_id: fbPost.id,
                message: fbPost.message,
                type: fbPost.status_type,
                permalink: fbPost.permalink_url,
                created_time: fbPost.created_time,
              });

              postsSaved += 1;
              postJobs.push({
                pageId: syncedPage.id,
                postId: syncedPost.id,
                fbPostId: syncedPost.fb_post_id,
                accessToken,
              });
            }
          }

          if (postJobs.length > 0) {
            await facebookSyncQueue.enqueuePostSyncBulk(postJobs);
            postsQueued += postJobs.length;
          }

          nextPageUrl = postsPage.paging?.next;
          pageNum++;
        } while (nextPageUrl);

        const pageEarningsSaved = await pageSyncService.syncPageCMEarningsForWindow(
          fbPage.id,
          accessToken,
          this.getWindowStart(payload.syncWindowDays ?? DEFAULT_SYNC_WINDOW_DAYS),
          syncUntil,
          allFbPosts
        );
        console.log(`[facebook-sync] 💰 Saved ${pageEarningsSaved} page earnings rows for ${fbPage.id}`);

        await syncJobService.updateSyncJob(syncJob.id, "completed");

        console.log(`[facebook-sync] 🎉 Successfully fully synced page: ${fbPage.name || fbPage.id} (${fbPage.id})`);
        console.log(`[facebook-sync] 📈 Page summary: ${postsSaved} posts saved, ${postsQueued} post insights queued.`);

        return {
          pageId: syncedPage.id,
          fbPageId: fbPage.id,
          pageName: syncedPage.page_name || fbPage.name || null,
          postsSaved,
          postsQueued,
          pageInsightsSaved: pageInsights.length,
        };
      } catch (error) {
        console.error(`[facebook-sync] ❌ Error syncing page ${fbPage.id}:`, error);
        if (syncJob) {
          await syncJobService.updateSyncJob(syncJob.id, "failed", error instanceof Error ? error.message : String(error));
        }
        throw error;
      }
    });
  }

  async processPostSyncJob(payload: PostSyncJobPayload): Promise<PostSyncJobResult> {
    return this.run("processPostSyncJob", async () => {
      const syncJob = await syncJobService.createSyncJob(payload.pageId, "post_sync");
      const syncUntil = new Date().toISOString();

      try {
        await syncJobService.updateSyncJob(syncJob.id, "running");

        const insights = await postSyncService.syncPostInsights({
          fbPostId: payload.fbPostId,
          facebookPostId: payload.fbPostId,
          accessToken: payload.accessToken,
          metrics: DEFAULT_POST_METRICS,
          since: this.getWindowStart(DEFAULT_SYNC_WINDOW_DAYS),
          until: syncUntil,
        });

        const postEarningsSaved = await postSyncService.syncPostCMEarningsForWindow(
          payload.fbPostId,
          payload.accessToken,
          this.getWindowStart(DEFAULT_SYNC_WINDOW_DAYS),
          syncUntil
        );
        console.log(`[facebook-sync] 💰 Saved ${postEarningsSaved} post earnings rows for ${payload.fbPostId}`);

        const post = await postRepository.getPostById(payload.postId);

        if (!post) {
          throw new Error(`Post ${payload.postId} not found`);
        }

        await syncJobService.updateSyncJob(syncJob.id, "completed");

        return {
          post,
          insightsSaved: insights.length,
        };
      } catch (error) {
        console.error(`[facebook-sync] ❌ Error fetching post insights for ${payload.fbPostId}:`, error);
        await syncJobService.updateSyncJob(syncJob.id, "failed", error instanceof Error ? error.message : String(error));
        throw error;
      }
    });
  }

  private getWindowStart(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }
}

export default new FacebookSyncOrchestrator();
