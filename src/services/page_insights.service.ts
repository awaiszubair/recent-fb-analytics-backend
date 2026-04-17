import { BaseService } from "../core/base.service";
import connectedPageRepository from "../repositories/ConnectedPage";
import pageInsightsRepository from "../repositories/PageInsights";
import type { PageInsightCreateInput, PageInsightEntity } from "../types/domain";
import { decryptPageToken } from "../utils/pageTokenCrypto";
import saveFacebookDataService from "./saveFacebookData.service";

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

const toDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getCoverageBounds = (items: PageInsightEntity[]): { earliest: Date; latest: Date } | null => {
  const dates = items
    .map((item) => item.end_time)
    .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));

  if (dates.length === 0) {
    return null;
  }

  return {
    earliest: new Date(Math.min(...dates.map((date) => date.getTime()))),
    latest: new Date(Math.max(...dates.map((date) => date.getTime()))),
  };
};

type DateWindow = {
  since: string;
  until: string;
};

const shiftDays = (date: Date, days: number): Date => {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
};

const getStoredInsightWindow = (since: Date, until: Date): { since: Date; until: Date } => {
  const storedSince = shiftDays(since, 1);
  return {
    since: storedSince,
    until: until < storedSince ? storedSince : until,
  };
};

const getMissingWindows = (
  requestedSince: Date,
  requestedUntil: Date,
  coverage: { earliest: Date; latest: Date } | null
): DateWindow[] => {
  if (!coverage) {
    return [{ since: requestedSince.toISOString(), until: requestedUntil.toISOString() }];
  }

  const windows: DateWindow[] = [];
  const prefixUntil = shiftDays(coverage.earliest, -1);
  const suffixSince = shiftDays(coverage.latest, 1);

  if (requestedSince < coverage.earliest && requestedSince <= prefixUntil) {
    windows.push({
      since: requestedSince.toISOString(),
      until: new Date(Math.min(prefixUntil.getTime(), requestedUntil.getTime())).toISOString(),
    });
  }

  if (requestedUntil > coverage.latest && suffixSince <= requestedUntil) {
    windows.push({
      since: new Date(Math.max(suffixSince.getTime(), requestedSince.getTime())).toISOString(),
      until: requestedUntil.toISOString(),
    });
  }

  return windows;
};

const resolveStoredToken = (storedToken?: string | null): string | null => {
  if (!storedToken) {
    return null;
  }

  try {
    return decryptPageToken(storedToken);
  } catch {
    return storedToken;
  }
};

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
    const requestedSince = toDate(options.since);
    const requestedUntil = toDate(options.until);

    if (!requestedSince || !requestedUntil) {
      return pageInsightsRepository.getPageInsights(fbPageId, options);
    }

    const storedWindow = getStoredInsightWindow(requestedSince, requestedUntil);
    const existing = await pageInsightsRepository.getPageInsights(fbPageId, {
      since: storedWindow.since.toISOString(),
      until: storedWindow.until.toISOString(),
    });

    const coverage = getCoverageBounds(existing);
    const missingWindows = getMissingWindows(storedWindow.since, storedWindow.until, coverage);

    if (missingWindows.length === 0) {
      return existing;
    }

    console.log("Start Contacting to meta------");

    const connectedPage = await connectedPageRepository.getPageByFbPageId(fbPageId);
    const accessToken = resolveStoredToken(connectedPage?.page_token_encrypted);

    console.log("The access token is: ", accessToken);

    if (!accessToken) {
      throw new Error(`No stored page token found for Facebook page ${fbPageId}`);
    }

    for (const window of missingWindows) {
      await saveFacebookDataService.syncPageInsights({
        pageId: fbPageId,
        facebookPageId: fbPageId,
        accessToken,
        metrics: DEFAULT_PAGE_METRICS,
        period: "day",
        since: shiftDays(new Date(window.since), -1).toISOString(),
        until: window.until,
      });
    }

    return pageInsightsRepository.getPageInsights(fbPageId, {
      since: storedWindow.since.toISOString(),
      until: storedWindow.until.toISOString(),
    });
  }

  async getPageMetrics(
    fbPageId: string,
    metricName: string,
    options: { since?: string; until?: string } = {}
  ): Promise<PageInsightEntity[]> {
    const requestedSince = toDate(options.since);
    const requestedUntil = toDate(options.until);

    if (!requestedSince || !requestedUntil) {
      return pageInsightsRepository.getPageMetrics(fbPageId, metricName, options);
    }

    const storedWindow = getStoredInsightWindow(requestedSince, requestedUntil);
    const existing = await pageInsightsRepository.getPageMetrics(fbPageId, metricName, {
      since: storedWindow.since.toISOString(),
      until: storedWindow.until.toISOString(),
    });

    const coverage = getCoverageBounds(existing);
    const missingWindows = getMissingWindows(storedWindow.since, storedWindow.until, coverage);

    if (missingWindows.length === 0) {
      return existing;
    }

    const connectedPage = await connectedPageRepository.getPageByFbPageId(fbPageId);
    const accessToken = resolveStoredToken(connectedPage?.page_token_encrypted);

    if (!accessToken) {
      throw new Error(`No stored page token found for Facebook page ${fbPageId}`);
    }

    for (const window of missingWindows) {
      await saveFacebookDataService.syncPageInsights({
        pageId: fbPageId,
        facebookPageId: fbPageId,
        accessToken,
        metrics: [metricName],
        period: "day",
        since: shiftDays(new Date(window.since), -1).toISOString(),
        until: window.until,
      });
    }

    return pageInsightsRepository.getPageMetrics(fbPageId, metricName, {
      since: storedWindow.since.toISOString(),
      until: storedWindow.until.toISOString(),
    });
  }
}

export default new PageInsightsService();
