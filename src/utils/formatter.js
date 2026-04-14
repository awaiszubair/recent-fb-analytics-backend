/**
 * Meta API Response Formatter
 * Normalizes dynamic Meta API responses to match database schema
 * 
 * Handles:
 * - Page insights responses
 * - Post insights responses
 * - User details responses
 * - Comments count responses
 * - Shares count responses
 */

/**
 * Format page insights from Meta API or Database
 * Meta returns: { data: [ { name, period, values: [{ value, end_time }] } ] }
 * DB returns: [ { metric_name, metric_value, period, end_time }, ... ]
 * @param {string} pageId - FB page ID
 * @param {object|array} response - Raw response from Meta API or DB query result
 * @returns {array} Array of formatted insight objects ready for schema
 */
const formatPageInsights = (pageId, response) => {
  try {
    const insights = [];
    
    if (!response) {
      console.warn('Invalid page insights response');
      return insights;
    }

    // Check if it's a Meta API response (has 'data' property with nested structure)
    if (response.data && Array.isArray(response.data)) {
      // Meta API format - normalize nested structure
      for (const item of response.data) {
        const metricName = item.name || 'unknown';
        const period = item.period || 'day';
        const values = Array.isArray(item.values) ? item.values : [];

        for (const value of values) {
          insights.push({
            metric_name: metricName,
            metric_value: value.value || null,
            period,
            end_time: value.end_time || null
          });
        }
      }
    } else if (Array.isArray(response)) {
      // Database format - already normalized, just validate structure
      for (const item of response) {
        if (item.metric_name !== undefined && item.metric_value !== undefined) {
          insights.push({
            metric_name: item.metric_name || 'unknown',
            metric_value: item.metric_value,
            period: item.period || 'day',
            end_time: item.end_time || null
          });
        }
      }
    }

    return insights;
  } catch (error) {
    console.error('Error formatting page insights:', error.message);
    return [];
  }
};

/**
 * Format post insights from Meta API or Database
 * Meta returns: { data: [ { name, values: [{ value, end_time }] } ] }
 * DB returns: [ { metric_name, metric_value, period, end_time }, ... ]
 * @param {string} postId - FB post ID
 * @param {object|array} response - Raw response from Meta API or DB query result
 * @returns {array} Array of formatted insight objects ready for schema
 */
const formatPostInsights = (postId, response) => {
  try {
    const insights = [];
    
    if (!response) {
      console.warn('Invalid post insights response');
      return insights;
    }

    // Check if it's a Meta API response (has 'data' property with nested structure)
    if (response.data && Array.isArray(response.data)) {
      // Meta API format - normalize nested structure
      for (const item of response.data) {
        const metricName = item.name || 'unknown';
        const values = Array.isArray(item.values) ? item.values : [];

        for (const value of values) {
          insights.push({
            metric_name: metricName,
            metric_value: value.value || null,
            period: item.period || null,
            end_time: value.end_time || null
          });
        }
      }
    } else if (Array.isArray(response)) {
      // Database format - already normalized, just validate structure
      for (const item of response) {
        if (item.metric_name !== undefined && item.metric_value !== undefined) {
          insights.push({
            metric_name: item.metric_name || 'unknown',
            metric_value: item.metric_value,
            period: item.period || null,
            end_time: item.end_time || null
          });
        }
      }
    }

    return insights;
  } catch (error) {
    console.error('Error formatting post insights:', error.message);
    return [];
  }
};

/**
 * Format user details from Meta API
 * Meta returns: { id, name, email, picture: { data: { url } } }
 * @param {object} metaResponse - Raw response from Meta API
 * @returns {object} Formatted user object
 */
const formatUserDetails = (metaResponse) => {
  try {
    if (!metaResponse) {
      return {};
    }

    return {
      fb_user_id: metaResponse.id || null,
      name: metaResponse.name || null,
      email: metaResponse.email || null,
      picture_url: metaResponse.picture?.data?.url || null
    };
  } catch (error) {
    console.error('Error formatting user details:', error.message);
    return {};
  }
};

/**
 * Format comments count from Meta API
 * Meta returns: { comments: { summary: { total_count } } }
 * @param {string} postId - FB post ID
 * @param {object} metaResponse - Raw response from Meta API
 * @returns {object} Formatted comments count object
 */
const formatCommentsCount = (postId, metaResponse) => {
  try {
    if (!metaResponse) {
      return {
        metric_name: 'comments.summary.total_count',
        metric_value: 0
      };
    }

    const totalCount = metaResponse.comments?.summary?.total_count || 0;

    return {
      metric_name: 'comments.summary.total_count',
      metric_value: totalCount
    };
  } catch (error) {
    console.error('Error formatting comments count:', error.message);
    return {
      metric_name: 'comments.summary.total_count',
      metric_value: 0
    };
  }
};

/**
 * Format shares count from Meta API
 * Meta returns: { shares: { count } }
 * @param {string} postId - FB post ID
 * @param {object} metaResponse - Raw response from Meta API
 * @returns {object} Formatted shares count object
 */
const formatSharesCount = (postId, metaResponse) => {
  try {
    if (!metaResponse) {
      return {
        metric_name: 'shares.count',
        metric_value: 0
      };
    }

    const shareCount = metaResponse.shares?.count || 0;

    return {
      metric_name: 'shares.count',
      metric_value: shareCount
    };
  } catch (error) {
    console.error('Error formatting shares count:', error.message);
    return {
      metric_name: 'shares.count',
      metric_value: 0
    };
  }
};

/**
 * Format connected page from Meta API or Database
 * Meta returns: { id, name, fan_count, ... }
 * DB returns: { fb_page_id, page_name, fan_count, ... }
 * @param {string} partnerId - Partner UUID
 * @param {object} response - Raw response from Meta API or DB query result
 * @returns {object} Formatted connected page object
 */
const formatConnectedPage = (partnerId, response) => {
  try {
    if (!response) {
      return {};
    }

    // Handle both Meta API format (id, name) and DB format (fb_page_id, page_name)
    return {
      partner_id: partnerId,
      fb_page_id: response.id || response.fb_page_id || null,
      page_name: response.name || response.page_name || null,
      fan_count: response.fan_count ? parseInt(response.fan_count) : 0,
      is_active: response.is_active !== undefined ? response.is_active : true
    };
  } catch (error) {
    console.error('Error formatting connected page:', error.message);
    return { partner_id: partnerId };
  }
};

/**
 * Format post from Meta API or Database
 * Meta returns: { id, message, type, created_time, permalink, ... }
 * DB returns: { fb_post_id, message, type, created_time, permalink, ... }
 * @param {string} pageId - Page UUID
 * @param {object} response - Raw response from Meta API or DB query result
 * @returns {object} Formatted post object
 */
const formatPost = (pageId, response) => {
  try {
    if (!response) {
      return {};
    }

    // Handle both Meta API format (id) and DB format (fb_post_id)
    return {
      page_id: pageId,
      fb_post_id: response.id || response.fb_post_id || null,
      message: response.message || null,
      type: response.type || null,
      permalink: response.permalink || null,
      created_time: response.created_time || null
    };
  } catch (error) {
    console.error('Error formatting post:', error.message);
    return { page_id: pageId };
  }
};

/**
 * Safely extract nested value from object
 * Usage: getNestedValue(metaResponse, 'data.insights.0.values.0.value')
 * @param {object} obj - Object to traverse
 * @param {string} path - Path string with dots
 * @returns {*} Value at path or null
 */
const getNestedValue = (obj, path) => {
  try {
    return path.split('.').reduce((current, part) => {
      if (current === null || current === undefined) return null;
      if (part.match(/^\d+$/)) return current[parseInt(part)];
      return current[part];
    }, obj);
  } catch {
    return null;
  }
};

module.exports = {
  formatPageInsights,
  formatPostInsights,
  formatUserDetails,
  formatCommentsCount,
  formatSharesCount,
  formatConnectedPage,
  formatPost,
  getNestedValue
};
