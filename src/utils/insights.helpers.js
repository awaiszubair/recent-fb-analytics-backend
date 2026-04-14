/**
 * Insights API Constants and Helpers
 */

// Meta Graph API Endpoints
const META_GRAPH_API = {
  BASE_URL: 'https://graph.instagram.com',
  VERSION: 'v18.0',
  INSIGHTS_ENDPOINT: '/insights',
};

// Supported metrics by type
const METRICS = {
  PAGE_ENGAGEMENT: [
    'page_total_actions',
    'page_engaged_users',
    'page_post_engagements',
    'page_consumptions',
    'page_fan_removes',
    'page_fans',
  ],
  PAGE_REACH: [
    'page_impressions',
    'page_impressions_unique',
    'page_reach',
    'page_reach_by_location',
    'page_reach_by_age_gender',
  ],
  PAGE_MONETIZATION: [
    'content_monetization_earnings',
    'content_monetization_subscriptions',
  ],
  PAGE_VIDEO: [
    'post_video_avg_time_watched',
    'post_video_complete_views_organic',
    'post_video_complete_views_paid',
    'post_video_complete_views_unique_organic',
    'post_video_complete_views_unique_paid',
  ],
  POST_ENGAGEMENT: [
    'post_engaged_users',
    'post_engagement',
    'post_engagements',
    'post_negative_feedback',
    'post_negative_feedback_unique',
    'post_negative_feedback_by_type',
    'post_negative_feedback_by_type_unique',
  ],
  POST_REACH: [
    'post_impressions',
    'post_impressions_unique',
    'post_impressions_organic',
    'post_impressions_organic_unique',
    'post_impressions_paid',
    'post_impressions_paid_unique',
  ],
  POST_ACTIONS: [
    'post_clicks',
    'post_clicks_by_type',
    'post_video_views',
    'post_video_views_organic',
    'post_video_views_paid',
    'post_video_views_autoplayed',
    'post_video_views_click_to_play',
    'post_video_views_unique',
  ],
};

// Supported periods for insights
const PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  LIFETIME: 'lifetime',
};

/**
 * Validate metric is supported
 * @param {string} metric - Metric name to validate
 * @returns {boolean}
 */
const isValidMetric = (metric) => {
  const allMetrics = Object.values(METRICS).flat();
  return allMetrics.includes(metric);
};

/**
 * Validate multiple metrics
 * @param {Array<string>} metrics - Array of metric names
 * @returns {object} - { valid: Array, invalid: Array }
 */
const validateMetrics = (metrics) => {
  const valid = [];
  const invalid = [];

  metrics.forEach((metric) => {
    if (isValidMetric(metric)) {
      valid.push(metric);
    } else {
      invalid.push(metric);
    }
  });

  return { valid, invalid };
};

/**
 * Validate period
 * @param {string} period - Period name to validate
 * @returns {boolean}
 */
const isValidPeriod = (period) => {
  return Object.values(PERIODS).includes(period);
};

/**
 * Format insights response
 * @param {object} data - Raw insights data from Meta API
 * @returns {object} - Formatted response
 */
const formatInsightsResponse = (data) => {
  if (!data || !data.data) {
    return { data: [] };
  }

  const formatted = data.data.map((item) => ({
    name: item.name,
    value: item.values && item.values.length > 0 ? item.values[0].value : null,
    period: item.period || null,
    title: item.title || item.name,
    description: item.description || '',
  }));

  return { data: formatted };
};

/**
 * Convert UNIX timestamp to readable format
 * @param {number} timestamp - UNIX timestamp
 * @returns {string} - Formatted date string
 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString();
};

/**
 * Build Meta API query
 * @param {string} resourceId - Page ID or Post ID
 * @param {Array<string>} metrics - Array of metrics
 * @param {object} options - Query options
 * @returns {string} - URL query string
 */
const buildMetaApiQuery = (resourceId, metrics, options = {}) => {
  const params = new URLSearchParams();

  params.append('metric', metrics.join(','));

  if (options.access_token) {
    params.append('access_token', options.access_token);
  }

  if (options.period) {
    params.append('period', options.period);
  }

  if (options.since) {
    params.append('since', options.since);
  }

  if (options.until) {
    params.append('until', options.until);
  }

  if (options.limit) {
    params.append('limit', options.limit);
  }

  return params.toString();
};

module.exports = {
  META_GRAPH_API,
  METRICS,
  PERIODS,
  isValidMetric,
  validateMetrics,
  isValidPeriod,
  formatInsightsResponse,
  formatTimestamp,
  buildMetaApiQuery,
};
