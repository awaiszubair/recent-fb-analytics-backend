import { BaseService } from "../core/base.service";
import connectedPageRepository from "../repositories/ConnectedPage";
import postRepository from "../repositories/Post";
import postInsightsRepository from "../repositories/PostInsights";
import type { PostInsightCreateInput, PostInsightEntity } from "../types/domain";
import { decryptPageToken } from "../utils/pageTokenCrypto";
import saveFacebookDataService from "./saveFacebookData.service";

const DEFAULT_POST_METRICS = ["post_impressions", "post_engaged_users", "post_clicks"];

const toDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getCoverageBounds = (items: PostInsightEntity[]): { earliest: Date; latest: Date } | null => {
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

export class PostInsightsService extends BaseService {
  constructor() {
    super("PostInsightsService");
  }

  createPostInsight(insightData: PostInsightCreateInput): Promise<PostInsightEntity> {
    return postInsightsRepository.createPostInsight(insightData);
  }

  async getPostInsights(
    fbPostId: string,
    options: { since?: string; until?: string } = {}
  ): Promise<PostInsightEntity[]> {
    const requestedSince = toDate(options.since);
    const requestedUntil = toDate(options.until);

    if (!requestedSince || !requestedUntil) {
      return postInsightsRepository.getPostInsights(fbPostId, options);
    }

    const storedWindow = getStoredInsightWindow(requestedSince, requestedUntil);
    const existing = await postInsightsRepository.getPostInsights(fbPostId, {
      since: storedWindow.since.toISOString(),
      until: storedWindow.until.toISOString(),
    });

    const coverage = getCoverageBounds(existing);
    const missingWindows = getMissingWindows(storedWindow.since, storedWindow.until, coverage);

    if (missingWindows.length === 0) {
      return existing;
    }

    const post = await postRepository.getPostByFbPostId(fbPostId);
    const connectedPage = post ? await connectedPageRepository.getPageById(post.page_id) : null;
    const accessToken = resolveStoredToken(connectedPage?.page_token_encrypted);

    if (!accessToken) {
      throw new Error(`No stored page token found for Facebook post ${fbPostId}`);
    }

    for (const window of missingWindows) {
      await saveFacebookDataService.syncPostInsights({
        fbPostId,
        facebookPostId: fbPostId,
        accessToken,
        metrics: DEFAULT_POST_METRICS,
        since: shiftDays(new Date(window.since), -1).toISOString(),
        until: window.until,
      });
    }

    return postInsightsRepository.getPostInsights(fbPostId, {
      since: storedWindow.since.toISOString(),
      until: storedWindow.until.toISOString(),
    });
  }

  async getPostMetrics(
    fbPostId: string,
    metricName: string,
    options: { since?: string; until?: string } = {}
  ): Promise<PostInsightEntity[]> {
    const requestedSince = toDate(options.since);
    const requestedUntil = toDate(options.until);

    if (!requestedSince || !requestedUntil) {
      return postInsightsRepository.getPostMetrics(fbPostId, metricName, options);
    }

    const storedWindow = getStoredInsightWindow(requestedSince, requestedUntil);
    const existing = await postInsightsRepository.getPostMetrics(fbPostId, metricName, {
      since: storedWindow.since.toISOString(),
      until: storedWindow.until.toISOString(),
    });

    const coverage = getCoverageBounds(existing);
    const missingWindows = getMissingWindows(storedWindow.since, storedWindow.until, coverage);

    if (missingWindows.length === 0) {
      return existing;
    }

    const post = await postRepository.getPostByFbPostId(fbPostId);
    const connectedPage = post ? await connectedPageRepository.getPageById(post.page_id) : null;
    const accessToken = resolveStoredToken(connectedPage?.page_token_encrypted);

    if (!accessToken) {
      throw new Error(`No stored page token found for Facebook post ${fbPostId}`);
    }

    for (const window of missingWindows) {
      await saveFacebookDataService.syncPostInsights({
        fbPostId,
        facebookPostId: fbPostId,
        accessToken,
        metrics: [metricName],
        since: shiftDays(new Date(window.since), -1).toISOString(),
        until: window.until,
      });
    }

    return postInsightsRepository.getPostMetrics(fbPostId, metricName, {
      since: storedWindow.since.toISOString(),
      until: storedWindow.until.toISOString(),
    });
  }
}

export default new PostInsightsService();
