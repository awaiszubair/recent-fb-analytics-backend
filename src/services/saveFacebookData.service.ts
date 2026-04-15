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
import type {
  CmEarningsPageEntity,
  CmEarningsPostEntity,
  ConnectedPageEntity,
  PageEarningsCreateInput,
  PageInsightCreateInput,
  PageInsightEntity,
  PartnerCreateInput,
  PartnerEntity,
  PostEarningsCreateInput,
  PostInsightCreateInput,
  PostInsightEntity,
  PostEntity,
  SyncJobCreateInput,
  SyncJobEntity,
  ThirdPartyDataEntity,
  ThirdPartyDataCreateInput,
} from "../types/domain";

type InitialSyncResult = {
  partner: PartnerEntity | null;
  pages: Array<{
    page: ConnectedPageEntity;
    insightsCount: number;
    postsCount: number;
    postsProcessed: Array<{ post: PostEntity; insightsCount: number }>;
  }>;
  errors: Array<{ pageId: string; error: string }>;
};

export class SaveFacebookDataService extends BaseService {
  constructor() {
    super("SaveFacebookDataService");
  }

  async initialConnectionSync(accessToken: string): Promise<InitialSyncResult> {
    return this.run("initialConnectionSync", async () => {
      const partner = await this.syncPartner(accessToken);
      const pagesResponse = await insightsService.getUserPages({ access_token: accessToken });

      const syncResults: InitialSyncResult = {
        partner,
        pages: [],
        errors: [],
      };

      for (const rawPage of pagesResponse.data) {
        const fbPage = rawPage as { id: string; name?: string; access_token?: string; fan_count?: number };

        try {
          const syncedPage = await this.syncPage({
            partner_id: partner!.id,
            fb_page_id: fbPage.id,
            page_name: fbPage.name || null,
            page_token_encrypted: fbPage.access_token || null,
            fan_count: fbPage.fan_count || 0,
            is_active: true,
            last_synced_at: new Date(),
          });

          const pageInsights = await this.syncPageInsights({
            pageId: syncedPage.id,
            facebookPageId: fbPage.id,
            accessToken: fbPage.access_token || accessToken,
          });

          const postsResponse = await insightsService.getPagePosts(fbPage.id, {
            access_token: fbPage.access_token || accessToken,
            limit: 100,
            fetchAll: true,
          });

          const syncedPosts: Array<{ fb_post_id: string; db_post: PostEntity; insightsCount: number }> = [];

          for (const rawPost of postsResponse.data) {
            const fbPost = rawPost as { id: string; message?: string; status_type?: string; permalink_url?: string; created_time?: string };
            try {
              const syncedPost = await this.syncPost({
                page_id: syncedPage.id,
                fb_post_id: fbPost.id,
                message: fbPost.message,
                type: fbPost.status_type,
                permalink: fbPost.permalink_url,
                created_time: fbPost.created_time,
              });

              syncedPosts.push({ fb_post_id: fbPost.id, db_post: syncedPost, insightsCount: 0 });
            } catch (postError) {
              console.error(`Failed to sync post ${fbPost.id}`, postError);
            }
          }

          if (syncedPosts.length > 0) {
            const fbPostIds = syncedPosts.map((post) => post.fb_post_id);
            const defaultPostMetrics = ["post_impressions", "post_impressions_unique", "post_engaged_users", "post_clicks"];

            try {
              const allBatchResults = await insightsService.getMultiplePostInsights(fbPostIds, defaultPostMetrics, {
                access_token: fbPage.access_token || accessToken,
              });

              for (const result of allBatchResults) {
                const mapping = syncedPosts.find((post) => post.fb_post_id === result.postId);

                if (result.success && mapping && result.data) {
                  const savedInsights = await this.savePostInsightsFromData(
                    mapping.db_post.id,
                    result.data as { data?: Array<{ name: string; period?: string; values?: Array<{ value: unknown; end_time?: string }> }> }
                  );
                  mapping.insightsCount = savedInsights.length;
                }
              }
            } catch (batchError) {
              console.error(`Failed batch insight fetch for page ${fbPage.id}`, batchError);
            }
          }

          syncResults.pages.push({
            page: syncedPage,
            insightsCount: pageInsights.length,
            postsCount: syncedPosts.length,
            postsProcessed: syncedPosts.map((item) => ({ post: item.db_post, insightsCount: item.insightsCount })),
          });
        } catch (pageError) {
          console.error(`Failed processing page ${fbPage.id}`, pageError);
          syncResults.errors.push({ pageId: fbPage.id, error: pageError instanceof Error ? pageError.message : String(pageError) });
        }
      }

      return syncResults;
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
      page_token_encrypted: pageData.page_token_encrypted || null,
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
    const defaultMetrics = ["page_impressions", "page_impressions_unique", "page_reach", "page_engaged_users"];
    const fbResponse = await insightsService.getPageInsights(params.facebookPageId, params.metrics || defaultMetrics, {
      access_token: params.accessToken,
      period: params.period || "day",
      since: params.since,
      until: params.until,
    });

    if (!fbResponse.success) {
      throw new Error("Failed to fetch page insights from Facebook");
    }

    const results: PageInsightEntity[] = [];
    const payload = fbResponse.data as { data?: Array<{ name: string; period?: string; values?: Array<{ value: unknown; end_time?: string }> }> };

    for (const insight of payload.data || []) {
      for (const entry of insight.values || []) {
        const saved = await pageInsightsRepository.upsertPageInsight({
          page_id: params.pageId,
          metric_name: insight.name,
          metric_value: entry.value as never,
          period: insight.period || "day",
          end_time: entry.end_time ? new Date(entry.end_time) : undefined,
          synced_at: new Date(),
        });
        results.push(saved);
      }
    }

    return results;
  }

  async syncPostInsights(params: {
    postId: string;
    facebookPostId: string;
    accessToken: string;
    metrics?: string[];
  }): Promise<PostInsightEntity[]> {
    const defaultMetrics = ["post_impressions", "post_impressions_unique", "post_engaged_users", "post_clicks"];
    const fbResponse = await insightsService.getPostInsights(params.facebookPostId, params.metrics || defaultMetrics, {
      access_token: params.accessToken,
    });

    if (!fbResponse.success) {
      throw new Error("Failed to fetch post insights from Facebook");
    }

    return this.savePostInsightsFromData(params.postId, fbResponse.data as { data?: Array<{ name: string; period?: string; values?: Array<{ value: unknown; end_time?: string }> }> });
  }

  async savePostInsightsFromData(dbPostId: string, insightsData: { data?: Array<{ name: string; period?: string; values?: Array<{ value: unknown; end_time?: string }> }> }): Promise<PostInsightEntity[]> {
    const results: PostInsightEntity[] = [];

    for (const insight of insightsData.data || []) {
      for (const entry of insight.values || []) {
        const saved = await postInsightsRepository.upsertPostInsight({
          post_id: dbPostId,
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
}

export default new SaveFacebookDataService();
