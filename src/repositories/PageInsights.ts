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
        ...(Object.keys(endTimeFilter).length > 0 ? { end_time: endTimeFilter } : {}),
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
        ...(Object.keys(endTimeFilter).length > 0 ? { end_time: endTimeFilter } : {}),
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
}

export default new PageInsightsRepository();
