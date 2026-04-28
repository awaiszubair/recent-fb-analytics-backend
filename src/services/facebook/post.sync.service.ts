import insightsService from "../insights.service";
import postRepository from "../../repositories/Post";
import postInsightsRepository from "../../repositories/PostInsights";
import earningsRepository from "../../repositories/Earnings";
import type {
  CmEarningsPostEntity,
  PostCreateInput,
  PostEarningsCreateInput,
  PostEntity,
  PostInsightEntity,
} from "../../types/domain";
import {
  EARNINGS_METRICS,
  buildDailyEarningsRows,
  type EarningsInsightEntry,
} from "../../utils/earnings.helpers";
import { DEFAULT_POST_METRICS } from "../facebookSync.presets";

export class PostSyncService {
  async syncPost(postData: {
    page_id: string;
    fb_post_id: string;
    message?: string | null;
    type?: string | null;
    permalink?: string | null;
    created_time?: string | Date | null;
    full_picture?: string | null;
    comments_count?: number | null;
    shares_count?: number | null;
  }): Promise<PostEntity> {
    return postRepository.upsertPost({
      page_id: postData.page_id,
      fb_post_id: postData.fb_post_id,
      message: postData.message || null,
      type: postData.type || null,
      full_picture: postData.full_picture || null,
      comments_count: postData.comments_count || 0,
      shares_count: postData.shares_count || 0,
      permalink: postData.permalink || null,
      created_time: postData.created_time ? new Date(postData.created_time) : undefined,
      synced_at: new Date(),
    } satisfies PostCreateInput);
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
    const effectiveMetrics: string[] = Array.from(
      new Set(params.metrics && params.metrics.length > 0 ? params.metrics : DEFAULT_POST_METRICS)
    );

    try {
      const fbResponse = await insightsService.getPostInsights(params.facebookPostId, effectiveMetrics, {
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
        `[facebook-sync] Skipping post insight metric "${effectiveMetrics}" for ${params.facebookPostId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    return results;
  }

  async savePostInsightsFromData(
    fbPostId: string,
    insightsData: { data?: Array<{ name: string; period?: string; values?: Array<{ value: unknown; end_time?: string }> }> }
  ): Promise<PostInsightEntity[]> {
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

  async syncPostCMEarningsForWindow(
    fbPostId: string,
    accessToken: string,
    since: string,
    until: string
  ): Promise<number> {
    try {
      const response = await insightsService.getPostInsights(fbPostId, EARNINGS_METRICS, {
        access_token: accessToken,
        period: "day",
        since,
        until,
      });

      if (!response.success) {
        return 0;
      }

      const rows = buildDailyEarningsRows(response.data as { data?: EarningsInsightEntry[] });
      let savedCount = 0;

      for (const row of rows) {
        await this.syncPostEarnings({
          post_id: fbPostId,
          earnings_amount: row.earnings_amount,
          approximate_earnings: row.approximate_earnings,
          currency: row.currency,
          period: row.period,
          end_time: row.end_time,
          synced_at: new Date(),
        });
        savedCount += 1;
      }

      return savedCount;
    } catch (error) {
      console.warn(
        `[facebook-sync] Skipping post earnings sync for ${fbPostId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return 0;
    }
  }
}

export default new PostSyncService();
