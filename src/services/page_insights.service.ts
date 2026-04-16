import { BaseService } from "../core/base.service";
import pageInsightsRepository from "../repositories/PageInsights";
import type { PageInsightCreateInput, PageInsightEntity } from "../types/domain";

export class PageInsightsService extends BaseService {
  constructor() {
    super("PageInsightsService");
  }

  createPageInsight(insightData: PageInsightCreateInput): Promise<PageInsightEntity> {
    return pageInsightsRepository.createPageInsight(insightData);
  }

  getPageInsights(fbPageId: string, options: { since?: string; until?: string } = {}): Promise<PageInsightEntity[]> {
    return pageInsightsRepository.getPageInsights(fbPageId, options);
  }

  getPageMetrics(fbPageId: string, metricName: string, options: { since?: string; until?: string } = {}): Promise<PageInsightEntity[]> {
    return pageInsightsRepository.getPageMetrics(fbPageId, metricName, options);
  }
}

export default new PageInsightsService();
