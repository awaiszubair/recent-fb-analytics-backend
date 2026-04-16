export class InsightsHelper {
  static readonly METRICS = {
    PAGE_ENGAGEMENT: [
      "page_total_actions",
      "page_engaged_users",
      "page_post_engagements",
      "page_consumptions",
      "page_fan_removes",
      "page_fans",
    ],
    PAGE_REACH: [
      "page_impressions",
      "page_impressions_unique",
      "page_reach",
      "page_reach_by_location",
      "page_reach_by_age_gender",
    ],
    PAGE_MONETIZATION: [
      "content_monetization_earnings",
      "content_monetization_subscriptions",
    ],
    PAGE_VIDEO: [
      "post_video_avg_time_watched",
      "post_video_complete_views_organic",
      "post_video_complete_views_paid",
      "post_video_complete_views_unique_organic",
      "post_video_complete_views_unique_paid",
    ],
    POST_ENGAGEMENT: [
      "post_engaged_users",
      "post_engagement",
      "post_engagements",
      "post_negative_feedback",
      "post_negative_feedback_unique",
      "post_negative_feedback_by_type",
      "post_negative_feedback_by_type_unique",
    ],
    POST_REACH: [
      "post_impressions",
      "post_impressions_unique",
      "post_impressions_organic",
      "post_impressions_organic_unique",
      "post_impressions_paid",
      "post_impressions_paid_unique",
    ],
    POST_ACTIONS: [
      "post_clicks",
      "post_clicks_by_type",
      "post_video_views",
      "post_video_views_organic",
      "post_video_views_paid",
      "post_video_views_autoplayed",
      "post_video_views_click_to_play",
      "post_video_views_unique",
    ],
  } as const;

  static readonly PERIODS = {
    DAY: "day",
    WEEK: "week",
    MONTH: "month",
    LIFETIME: "lifetime",
  } as const;

  static isValidMetric(metric: string): boolean {
    const allMetrics = Object.values(this.METRICS).flat();
    return (allMetrics as string[]).includes(metric);
  }

  static validateMetrics(metrics: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const metric of metrics) {
      if (this.isValidMetric(metric)) {
        valid.push(metric);
      } else {
        invalid.push(metric);
      }
    }

    return { valid, invalid };
  }

  static isValidPeriod(period: string): boolean {
    return Object.values(this.PERIODS).includes(period as (typeof InsightsHelper.PERIODS)[keyof typeof InsightsHelper.PERIODS]);
  }

  static formatTimestamp(timestamp?: number | null): string | null {
    if (!timestamp) {
      return null;
    }

    return new Date(timestamp * 1000).toISOString();
  }

  static buildMetaApiQuery(metrics: string[], options: { access_token?: string; period?: string; since?: string; until?: string; limit?: number } = {}): string {
    const params = new URLSearchParams();
    params.append("metric", metrics.join(","));

    if (options.access_token) params.append("access_token", options.access_token);
    if (options.period) params.append("period", options.period);
    if (options.since) params.append("since", options.since);
    if (options.until) params.append("until", options.until);
    if (options.limit) params.append("limit", String(options.limit));

    return params.toString();
  }
}

export const META_GRAPH_API = {
  BASE_URL: "https://graph.facebook.com",
  VERSION: "v25.0",
  INSIGHTS_ENDPOINT: "/insights",
} as const;

export const METRICS = InsightsHelper.METRICS;
export const PERIODS = InsightsHelper.PERIODS;
export const isValidMetric = InsightsHelper.isValidMetric;
export const validateMetrics = InsightsHelper.validateMetrics;
export const isValidPeriod = InsightsHelper.isValidPeriod;
export const formatTimestamp = InsightsHelper.formatTimestamp;
export const buildMetaApiQuery = InsightsHelper.buildMetaApiQuery;
