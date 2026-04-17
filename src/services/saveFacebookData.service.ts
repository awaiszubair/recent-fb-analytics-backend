import { BaseService } from "../core/base.service";
import insightsService from "./insights.service";
import partnerRepository from "../repositories/Partner";
import pageRepository from "../repositories/ConnectedPage";
import postRepository from "../repositories/Post";
import pageInsightsRepository from "../repositories/PageInsights";
import postInsightsRepository from "../repositories/PostInsights";
import earningsRepository from "../repositories/Earnings";
import syncJobRepository from "../repositories/SyncJob";
import thirdPartyDataRepository from "../repositories/ThirdPartyData";
import { facebookSyncQueue } from "../queues/facebookSync.queue";
import { encryptPageToken } from "../utils/pageTokenCrypto";
import type { GraphQueryOptions, PartnerCreateInput, PartnerEntity, PageEarningsCreateInput, PageInsightEntity, PageInsightCreateInput, PostEarningsCreateInput, PostInsightEntity, PostInsightCreateInput, PostEntity, SyncJobEntity, ThirdPartyDataCreateInput, ThirdPartyDataEntity, CmEarningsPageEntity, CmEarningsPostEntity, ConnectedPageEntity } from "../types/domain";
import type { FacebookPage, FacebookPost } from "../types/facebook";
import type { InitialConnectionSyncResult, PageSyncJobPayload, PageSyncJobResult, PostSyncJobPayload, PostSyncJobResult } from "../types/facebookSync";

const DEFAULT_PAGE_METRICS = [
  // 'content_monetization_earnings', // Total CM earnings
  // 'monetization_approximate_earnings', // Approx Earnings
  'page_impressions_unique', // Total Reach
  'page_post_engagements', // Total Engagements
  'page_media_view', // Total Impressions
  'page_follows', // Replacement of page_fans
  // 'page_fan_adds', // Deprecated by Meta
  // 'page_fan_removes', // Deprecated by Meta
  // 'page_reactions_by_type_total', // Reactions
  'page_video_views', // Video Views (all)
  'page_views_total', // Page Views
];
const DEFAULT_POST_METRICS = [
  // 'content_monetization_earnings', // CM Revenue
  // 'monetization_approximate_earnings', //Approx Earnings
  'post_impressions_unique', //Reach
  'post_media_view', // Impressions
  'post_impressions_organic_unique', // Organic Reach
  'post_impressions_paid_unique', // Paid Reach
  'post_reactions_by_type_total', // Reactions
  'post_clicks_by_type', // Clicks (Link, Photo, Other)
  'post_video_views', // 3s views
  'post_video_avg_time_watched', // Avg watch time (milliseconds)
  'post_video_retention_graph', // Retention curve
];
const DEFAULT_SYNC_WINDOW_DAYS = 90;
const DEFAULT_POST_FETCH_LIMIT = 100;
const DEFAULT_POST_WRITE_CHUNK = 10;

export class SaveFacebookDataService extends BaseService {
  constructor() {
    super("SaveFacebookDataService");
  }

  async initialConnectionSync(accessToken: string): Promise<InitialConnectionSyncResult> {
    return this.run("initialConnectionSync", async () => {
      const partner = await this.syncPartner(accessToken);
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
      let syncJob: SyncJobEntity | null = null;

      console.log(`[facebook-sync] 🚀 Starting full sync for page: ${fbPage.name || fbPage.id} (${fbPage.id})`);

      try {
        const syncedPage = await this.syncPage({
          partner_id: payload.partnerId,
          fb_page_id: fbPage.id,
          page_name: fbPage.name || null,
          page_token_encrypted: fbPage.access_token || null,
          fan_count: fbPage.fan_count || 0,
          is_active: true,
          last_synced_at: new Date(),
        });

        syncJob = await this.createSyncJob(syncedPage.id, "page_sync");
        await this.updateSyncJob(syncJob.id, "running");

        console.log(`[facebook-sync] 📊 Fetching page insights for ${fbPage.id}...`);
        const pageInsights = await this.syncPageInsights({
          pageId: syncedPage.id,
          facebookPageId: fbPage.id,
          accessToken,
          metrics: payload.pageMetrics || DEFAULT_PAGE_METRICS,
          period: "day",
          since: this.getWindowStart(payload.syncWindowDays ?? DEFAULT_SYNC_WINDOW_DAYS),
          until: new Date().toISOString(),
        });
        console.log(`[facebook-sync] ✅ Saved ${pageInsights.length} page insights for ${fbPage.id}`);

        let postsSaved = 0;
        let postsQueued = 0;
        let nextPageUrl: string | undefined;

        console.log(`[facebook-sync] 📝 Starting to fetch posts for page ${fbPage.id}...`);
        let pageNum = 1;

        do {
          const postsPage = await insightsService.getPagePostsPage(fbPage.id, {
            access_token: accessToken,
            limit: payload.postBatchSize ?? DEFAULT_POST_FETCH_LIMIT,
            since: this.getWindowStart(payload.syncWindowDays ?? DEFAULT_SYNC_WINDOW_DAYS),
            until: new Date().toISOString(),
            nextPageUrl,
          });

          const postJobs: PostSyncJobPayload[] = [];
          const fbPosts = postsPage.data.filter((rawPost): rawPost is FacebookPost => Boolean(rawPost?.id));
          console.log(`[facebook-sync] 🔄 Fetched batch ${pageNum} (${fbPosts.length} posts) from Facebook for page ${fbPage.id}`);

          const postWriteChunkSize = payload.postWriteChunkSize ?? DEFAULT_POST_WRITE_CHUNK;

          for (let index = 0; index < fbPosts.length; index += postWriteChunkSize) {
            const chunk = fbPosts.slice(index, index + postWriteChunkSize);
            const syncedChunk: PostEntity[] = [];

            for (const fbPost of chunk) {
              const syncedPost = await this.syncPost({
                page_id: syncedPage.id,
                fb_post_id: fbPost.id,
                message: fbPost.message,
                type: fbPost.status_type,
                permalink: fbPost.permalink_url,
                created_time: fbPost.created_time,
              });

              syncedChunk.push(syncedPost);
              postJobs.push({
                pageId: syncedPage.id,
                postId: syncedPost.id,
                fbPostId: syncedPost.fb_post_id,
                accessToken,
              });
            }

            postsSaved += syncedChunk.length;
          }

          if (postJobs.length > 0) {
            await facebookSyncQueue.enqueuePostSyncBulk(postJobs);
            postsQueued += postJobs.length;
          }

          nextPageUrl = postsPage.paging?.next;
          pageNum++;
        } while (nextPageUrl);

        await this.updateSyncJob(syncJob.id, "completed");

        console.log(`[facebook-sync] 🎉 Successfully fully synced page: ${fbPage.name || fbPage.id} (${fbPage.id})`);
        console.log(`[facebook-sync] 📈 Page summary: ${postsSaved} posts saved, ${postsQueued} post insights queued.`);

        return {
          page: syncedPage,
          postsSaved,
          postsQueued,
          pageInsightsSaved: pageInsights.length,
        };
      } catch (error) {
        console.error(`[facebook-sync] ❌ Error syncing page ${fbPage.id}:`, error);
        if (syncJob) {
          await this.updateSyncJob(syncJob.id, "failed", error instanceof Error ? error.message : String(error));
        }
        throw error;
      }
    });
  }

  async processPostSyncJob(payload: PostSyncJobPayload): Promise<PostSyncJobResult> {
    return this.run("processPostSyncJob", async () => {
      const syncJob = await this.createSyncJob(payload.pageId, "post_sync");
      // console.log(`[facebook-sync] 🔍 Fetching insights for post ${payload.fbPostId}...`);

      try {
        await this.updateSyncJob(syncJob.id, "running");

        const insights = await this.syncPostInsights({
          fbPostId: payload.fbPostId,
          facebookPostId: payload.fbPostId,
          accessToken: payload.accessToken,
          metrics: DEFAULT_POST_METRICS,
          since: this.getWindowStart(DEFAULT_SYNC_WINDOW_DAYS),
          until: new Date().toISOString(),
        });

        const post = await postRepository.getPostById(payload.postId);

        if (!post) {
          throw new Error(`Post ${payload.postId} not found`);
        }

        await this.updateSyncJob(syncJob.id, "completed");
        // console.log(`[facebook-sync] ✔️ Post insights saved for ${payload.fbPostId}`);

        return {
          post,
          insightsSaved: insights.length,
        };
      } catch (error) {
        console.error(`[facebook-sync] ❌ Error fetching post insights for ${payload.fbPostId}:`, error);
        await this.updateSyncJob(syncJob.id, "failed", error instanceof Error ? error.message : String(error));
        throw error;
      }
    });
  }

  async syncPartner(accessToken: string): Promise<PartnerEntity> {
    const fbUser = await insightsService.getUserDetails({ access_token: accessToken });
    const user = fbUser.data as { id: string; name?: string; email?: string };

    const partnerInput: PartnerCreateInput = {
      user_id: user.id,
      name: user.name || null,
      email: user.email || null,
    };

    return partnerRepository.upsertPartner(partnerInput);
  }

  async syncPage(pageData: {
    partner_id: string;
    fb_page_id: string;
    page_name?: string | null;
    page_token_encrypted?: string | null;
    fan_count?: number | string | bigint;
    is_active?: boolean;
    last_synced_at?: Date | null;
  }): Promise<ConnectedPageEntity> {
    return pageRepository.upsertPage({
      partner_id: pageData.partner_id,
      fb_page_id: pageData.fb_page_id,
      page_name: pageData.page_name || null,
      page_token_encrypted: pageData.page_token_encrypted ? encryptPageToken(pageData.page_token_encrypted) : null,
      fan_count: pageData.fan_count || 0,
      is_active: pageData.is_active !== false,
      last_synced_at: pageData.last_synced_at || new Date(),
    });
  }

  async syncPost(postData: {
    page_id: string;
    fb_post_id: string;
    message?: string | null;
    type?: string | null;
    permalink?: string | null;
    created_time?: string | Date | null;
  }): Promise<PostEntity> {
    return postRepository.upsertPost({
      page_id: postData.page_id,
      fb_post_id: postData.fb_post_id,
      message: postData.message || null,
      type: postData.type || null,
      permalink: postData.permalink || null,
      created_time: postData.created_time ? new Date(postData.created_time) : undefined,
      synced_at: new Date(),
    });
  }

  async syncPageInsights(params: {
    pageId: string;
    facebookPageId: string;
    accessToken: string;
    metrics?: string[];
    period?: string;
    since?: string;
    until?: string;
  }): Promise<PageInsightEntity[]> {
    const results: PageInsightEntity[] = [];
    const metrics = Array.from(new Set(params.metrics && params.metrics.length > 0 ? params.metrics : DEFAULT_PAGE_METRICS));

    try {
      const fbResponse = await insightsService.getPageInsights(params.facebookPageId, metrics, {
        access_token: params.accessToken,
        period: params.period || "day",
        since: params.since,
        until: params.until,
      });

      if (!fbResponse.success) {
        throw new Error("Failed to fetch page insights");
      }

      console.log("The metrics are: ", metrics);
      const payload = fbResponse.data as { data?: Array<{ name: string; period?: string; values?: Array<{ value: unknown; end_time?: string }> }> };

      for (const insight of payload.data || []) {
        for (const entry of insight.values || []) {
          const saved = await pageInsightsRepository.upsertPageInsight({
            page_id: params.facebookPageId,
            metric_name: insight.name,
            metric_value: entry.value as never,
            period: insight.period || "day",
            end_time: entry.end_time ? new Date(entry.end_time) : undefined,
            synced_at: new Date(),
          });
          results.push(saved);
        }
      }
    } catch (error) {
      console.warn(
        `[facebook-sync] Skipping page insight metric "${metrics}" for ${params.facebookPageId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    return results;
  }

  async syncPostInsights(params: {
    fbPostId: string;
    facebookPostId: string;
    accessToken: string;
    metrics?: string[];
    since?: string;
    until?: string;
  }): Promise<PostInsightEntity[]> {
    const results: PostInsightEntity[] = [];
    const metrics = Array.from(new Set(params.metrics && params.metrics.length > 0 ? params.metrics : DEFAULT_POST_METRICS));

    try {
      console.log("The metric going in is: ", metrics);
      const fbResponse = await insightsService.getPostInsights(params.facebookPostId, metrics, {
        access_token: params.accessToken,
        since: params.since,
        until: params.until,
      });

      if (!fbResponse.success) {
        throw new Error("Failed to fetch post insights");
      }

      const saved = await this.savePostInsightsFromData(
        params.fbPostId,
        fbResponse.data as { data?: Array<{ name: string; period?: string; values?: Array<{ value: unknown; end_time?: string }> }> }
      );
      results.push(...saved);
    } catch (error) {
      console.warn(
        `[facebook-sync] Skipping post insight metric "${metrics}" for ${params.facebookPostId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    return results;
  }

  async savePostInsightsFromData(fbPostId: string, insightsData: { data?: Array<{ name: string; period?: string; values?: Array<{ value: unknown; end_time?: string }> }> }): Promise<PostInsightEntity[]> {
    const results: PostInsightEntity[] = [];

    for (const insight of insightsData.data || []) {
      for (const entry of insight.values || []) {
        const saved = await postInsightsRepository.upsertPostInsight({
          post_id: fbPostId,
          metric_name: insight.name,
          metric_value: entry.value as never,
          period: insight.period || null,
          end_time: entry.end_time ? new Date(entry.end_time) : undefined,
          synced_at: new Date(),
        });
        results.push(saved);
      }
    }

    return results;
  }

  async syncPageEarnings(earningsData: PageEarningsCreateInput): Promise<CmEarningsPageEntity> {
    return earningsRepository.upsertPageEarnings({
      page_id: earningsData.page_id,
      earnings_amount: earningsData.earnings_amount || 0,
      approximate_earnings: earningsData.approximate_earnings || 0,
      currency: earningsData.currency || "USD",
      period: earningsData.period || null,
      end_time: earningsData.end_time || null,
      content_type_breakdown: earningsData.content_type_breakdown || null,
      synced_at: earningsData.synced_at || new Date(),
    });
  }

  async syncPostEarnings(earningsData: PostEarningsCreateInput): Promise<CmEarningsPostEntity> {
    return earningsRepository.upsertPostEarnings({
      post_id: earningsData.post_id,
      earnings_amount: earningsData.earnings_amount || 0,
      approximate_earnings: earningsData.approximate_earnings || 0,
      currency: earningsData.currency || "USD",
      period: earningsData.period || null,
      end_time: earningsData.end_time || null,
      synced_at: earningsData.synced_at || new Date(),
    });
  }

  async createSyncJob(pageId: string, jobType: string): Promise<SyncJobEntity> {
    return syncJobRepository.createSyncJob({
      page_id: pageId,
      job_type: jobType,
      status: "pending",
      started_at: new Date(),
    });
  }

  async updateSyncJob(jobId: string, status: string, errorLog: string | null = null): Promise<SyncJobEntity> {
    return syncJobRepository.updateSyncJob(jobId, {
      status,
      error_log: errorLog,
      completed_at: ["completed", "failed"].includes(status) ? new Date() : undefined,
    });
  }

  async saveThirdPartyData(pageId: string | null, postId: string | null, dataType: string, value: unknown): Promise<ThirdPartyDataEntity> {
    const payload: ThirdPartyDataCreateInput = {
      page_id: pageId,
      post_id: postId,
      data_type: dataType,
      value: value as never,
      synced_at: new Date(),
    };

    return thirdPartyDataRepository.createThirdPartyData(payload);
  }

  private getWindowStart(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }
}

export default new SaveFacebookDataService();
