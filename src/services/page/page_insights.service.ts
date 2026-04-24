import { BaseService } from "../../core/base.service";
import connectedPageRepository from "../../repositories/ConnectedPage";
import pageInsightsRepository from "../../repositories/PageInsights";
import type { PageInsightCreateInput, PageInsightEntity } from "../../types/domain";
import { DEFAULT_PAGE_METRICS } from "../facebookSync.presets";
import pageSyncService from "../facebook/page.sync.service";
import {
  resolveInsightCache,
  resolveStoredToken,
} from "../../utils/insight-cache.helpers";

export class PageInsightsService extends BaseService {
  constructor() {
    super("PageInsightsService");
  }

  createPageInsight(insightData: PageInsightCreateInput): Promise<PageInsightEntity> {
    return pageInsightsRepository.createPageInsight(insightData);
  }

  async getPageInsights(
    fbPageId: string,
    options: { since?: string; until?: string } = {}
  ): Promise<PageInsightEntity[]> {
    return resolveInsightCache<PageInsightEntity>({
      entityId: fbPageId,
      options,
      defaultMetrics: DEFAULT_PAGE_METRICS,
      loadAllFromDb: (pageId, query) => pageInsightsRepository.getPageInsights(pageId, query),
      loadMetricFromDb: (pageId, metricName, query) => pageInsightsRepository.getPageMetrics(pageId, metricName, query),
      resolveAccessToken: async (pageId) => {
        const connectedPage = await connectedPageRepository.getPageByFbPageId(pageId);
        return resolveStoredToken(connectedPage?.page_token_encrypted);
      },
      fetchMissingFromApi: async (pageId, accessToken, metrics, window) => {
        await pageSyncService.syncPageInsights({
          pageId,
          facebookPageId: pageId,
          accessToken,
          metrics,
          period: "day",
          since: window.since,
          until: window.until,
        });
      },
    });
  }

  async getPageMetrics(
    fbPageId: string,
    metricName: string,
    options: { since?: string; until?: string } = {}
  ): Promise<PageInsightEntity[]> {
    return resolveInsightCache<PageInsightEntity>({
      entityId: fbPageId,
      options,
      metricName,
      defaultMetrics: DEFAULT_PAGE_METRICS,
      loadAllFromDb: (pageId, query) => pageInsightsRepository.getPageInsights(pageId, query),
      loadMetricFromDb: (pageId, metric, query) => pageInsightsRepository.getPageMetrics(pageId, metric, query),
      resolveAccessToken: async (pageId) => {
        const connectedPage = await connectedPageRepository.getPageByFbPageId(pageId);
        return resolveStoredToken(connectedPage?.page_token_encrypted);
      },
      fetchMissingFromApi: async (pageId, accessToken, metrics, window) => {
        await pageSyncService.syncPageInsights({
          pageId,
          facebookPageId: pageId,
          accessToken,
          metrics,
          period: "day",
          since: window.since,
          until: window.until,
        });
      },
    });
  }
}

export default new PageInsightsService();
