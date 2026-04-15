import { getDB } from "../config/database";
import { BaseRepository } from "../core/base.repository";
import type { AnyRecord, PostInsightCreateInput, PostInsightEntity } from "../types/domain";

export class PostInsightsRepository extends BaseRepository<PostInsightEntity> {
  protected readonly tableName = "post_insights";

  protected get delegate() {
    return getDB().postInsight;
  }

  createPostInsight(insightData: PostInsightCreateInput): Promise<PostInsightEntity> {
    return this.createRecord(insightData);
  }

  getPostInsights(postId: string, options: { since?: string; until?: string } = {}): Promise<PostInsightEntity[]> {
    const endTimeFilter: AnyRecord = {
      ...(options.since ? { gte: options.since } : {}),
      ...(options.until ? { lte: options.until } : {}),
    };

    return this.findManyRecords({
      where: {
        post_id: postId,
        ...(Object.keys(endTimeFilter).length > 0 ? { end_time: endTimeFilter } : {}),
      },
      orderBy: [{ end_time: "desc" }, { synced_at: "desc" }],
    });
  }

  getPostMetrics(postId: string, metricName: string, options: { since?: string; until?: string } = {}): Promise<PostInsightEntity[]> {
    const endTimeFilter: AnyRecord = {
      ...(options.since ? { gte: options.since } : {}),
      ...(options.until ? { lte: options.until } : {}),
    };

    return this.findManyRecords({
      where: {
        post_id: postId,
        metric_name: metricName,
        ...(Object.keys(endTimeFilter).length > 0 ? { end_time: endTimeFilter } : {}),
      },
      orderBy: [{ end_time: "desc" }, { synced_at: "desc" }],
    });
  }

  upsertPostInsight(insightData: PostInsightCreateInput): Promise<PostInsightEntity> {
    return this.upsertByLookup(
      {
        post_id: insightData.post_id,
        metric_name: insightData.metric_name,
        period: insightData.period,
        end_time: insightData.end_time,
      },
      insightData,
      insightData
    );
  }
}

export default new PostInsightsRepository();
