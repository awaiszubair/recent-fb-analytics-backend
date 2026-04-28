import { getDB } from "../config/database";
import { BaseRepository } from "../core/base.repository";
import type { AnyRecord, PageInsightCreateInput, PageInsightEntity } from "../types/domain";

const toDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export class PageInsightsRepository extends BaseRepository<PageInsightEntity> {
  protected readonly tableName = "page_insights";

  protected get delegate() {
    return getDB().pageInsight;
  }

  createPageInsight(insightData: PageInsightCreateInput): Promise<PageInsightEntity> {
    return this.createRecord(insightData);
  }

  getPageInsights(fbPageId: string, options: { since?: string; until?: string } = {}): Promise<PageInsightEntity[]> {
    const endTimeFilter: AnyRecord = {
      ...(toDate(options.since) ? { gte: toDate(options.since) } : {}),
      ...(toDate(options.until) ? { lte: toDate(options.until) } : {}),
    };

    return this.findManyRecords({
      where: {
        page_id: fbPageId,
        OR: [
          ...(Object.keys(endTimeFilter).length > 0 ? [{ end_time: endTimeFilter }] : []),
          { period: "lifetime" },
          { end_time: null },
        ],
      },
      // orderBy: [{ end_time: "desc" }, { synced_at: "desc" }],
      orderBy: [{ metric_name: "asc" }, { end_time: "asc" }],
    });
  }

  getPageMetrics(fbPageId: string, metricName: string, options: { since?: string; until?: string } = {}): Promise<PageInsightEntity[]> {
    const endTimeFilter: AnyRecord = {
      ...(toDate(options.since) ? { gte: toDate(options.since) } : {}),
      ...(toDate(options.until) ? { lte: toDate(options.until) } : {}),
    };

    return this.findManyRecords({
      where: {
        page_id: fbPageId,
        metric_name: metricName,
        OR: [
          ...(Object.keys(endTimeFilter).length > 0 ? [{ end_time: endTimeFilter }] : []),
          { period: "lifetime" },
          { end_time: null },
        ],
      },
      orderBy: [{ end_time: "desc" }, { synced_at: "desc" }],
    });
  }

  upsertPageInsight(insightData: PageInsightCreateInput): Promise<PageInsightEntity> {
    return this.upsertByLookup(
      {
        page_id: insightData.page_id,
        metric_name: insightData.metric_name,
        period: insightData.period,
        end_time: insightData.end_time,
      },
      insightData,
      insightData
    );
  }

  /** Incremental sync: check if a row already exists for a given page, metric and date */
  async findByMetricAndDate(pageId: string, metricName: string, date: Date): Promise<PageInsightEntity | null> {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    const result = await this.delegate.findFirst({
      where: { page_id: pageId, metric_name: metricName, end_time: { gte: start, lte: end } },
    });

    return result;
  }
}

export default new PageInsightsRepository();
