import { BaseService } from "../core/base.service";
import postInsightsRepository from "../repositories/PostInsights";
import type { PostInsightCreateInput, PostInsightEntity } from "../types/domain";

export class PostInsightsService extends BaseService {
  constructor() {
    super("PostInsightsService");
  }

  createPostInsight(insightData: PostInsightCreateInput): Promise<PostInsightEntity> {
    return postInsightsRepository.createPostInsight(insightData);
  }

  getPostInsights(postId: string, options: { since?: string; until?: string } = {}): Promise<PostInsightEntity[]> {
    return postInsightsRepository.getPostInsights(postId, options);
  }

  getPostMetrics(postId: string, metricName: string, options: { since?: string; until?: string } = {}): Promise<PostInsightEntity[]> {
    return postInsightsRepository.getPostMetrics(postId, metricName, options);
  }
}

export default new PostInsightsService();
