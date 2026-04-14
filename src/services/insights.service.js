const axios = require('axios');

const GRAPH_API_VERSION = 'v25.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

class InsightsService {

  async getPageInsights(pageId, metrics, options = {}) {
    try {
      const {
        access_token,
        period = 'day', // day, week, month, lifetime
        since,
        until,
      } = options;

      if (!access_token) {
        throw new Error('Access token is required');
      }

      if (!pageId) {
        throw new Error('Page ID is required');
      }

      if (!metrics || metrics.length === 0) {
        throw new Error('At least one metric is required');
      }

      const params = {
        access_token,
        metric: metrics.join(','),
        period,
      };

      // Add optional date range parameters
      if (since) params.since = since;
      if (until) params.until = until;

      const response = await axios.get(
        `${GRAPH_API_BASE_URL}/${pageId}/insights`,
        { params, timeout: 30000 }
      );

      return {
        success: true,
        pageId,
        metrics,
        period,
        data: response.data,
      };
    } catch (error) {
      const apiMessage =
        error.response && error.response.data
          ? (error.response.data.error && error.response.data.error.message) || JSON.stringify(error.response.data)
          : error.message;
      throw new Error(`Failed to fetch page insights: ${apiMessage}`);
    }
  }


  async getPostInsights(postId, metrics, options = {}) {
    try {
      const { access_token, fields } = options;

      if (!access_token) {
        throw new Error('Access token is required');
      }

      if (!postId) {
        throw new Error('Post ID is required');
      }

      if (!metrics || metrics.length === 0) {
        throw new Error('At least one metric is required');
      }

      const params = {
        access_token,
        metric: metrics.join(','),
      };

      const response = await axios.get(
        `${GRAPH_API_BASE_URL}/${postId}/insights`,
        { params, timeout: 30000 }
      );

      return {
        success: true,
        postId,
        metrics,
        data: response.data,
      };
    } catch (error) {
      const apiMessage =
        error.response && error.response.data
          ? (error.response.data.error && error.response.data.error.message) || JSON.stringify(error.response.data)
          : error.message;
      throw new Error(`Failed to fetch post insights: ${apiMessage}`);
    }
  }

  async getPostCommentsCount(postId, options = {}) {
    try {
      const { access_token } = options;

      if (!access_token) {
        throw new Error('Access token is required');
      }

      if (!postId) {
        throw new Error('Post ID is required');
      }

      const params = {
        access_token,
        fields: 'comments.summary(true)',
      };

      const response = await axios.get(
        `${GRAPH_API_BASE_URL}/${postId}`,
        { params, timeout: 30000 }
      );

      return {
        success: true,
        postId,
        metric: 'comments.summary.total_count',
        data: response.data,
      };
    } catch (error) {
      const apiMessage =
        error.response && error.response.data
          ? (error.response.data.error && error.response.data.error.message) || JSON.stringify(error.response.data)
          : error.message;
      throw new Error(`Failed to fetch post comments count: ${apiMessage}`);
    }
  }

  async getPostSharesCount(postId, options = {}) {
    try {
      const { access_token } = options;

      if (!access_token) {
        throw new Error('Access token is required');
      }

      if (!postId) {
        throw new Error('Post ID is required');
      }

      const params = {
        access_token,
        fields: 'shares',
      };

      const response = await axios.get(
        `${GRAPH_API_BASE_URL}/${postId}`,
        { params, timeout: 30000 }
      );

      return {
        success: true,
        postId,
        metric: 'shares.count',
        data: response.data,
      };
    } catch (error) {
      const apiMessage =
        error.response && error.response.data
          ? (error.response.data.error && error.response.data.error.message) || JSON.stringify(error.response.data)
          : error.message;
      throw new Error(`Failed to fetch post shares count: ${apiMessage}`);
    }
  }

  async getUserDetails(options = {}) {
    try {
      const { access_token, fields = 'id,name,email,picture' } = options;

      if (!access_token) {
        throw new Error('Access token is required');
      }

      const params = {
        access_token,
        fields,
      };

      const response = await axios.get(
        `${GRAPH_API_BASE_URL}/me`,
        { params, timeout: 30000 }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const apiMessage =
        error.response && error.response.data
          ? (error.response.data.error && error.response.data.error.message) || JSON.stringify(error.response.data)
          : error.message;
      throw new Error(`Failed to fetch user details: ${apiMessage}`);
    }
  }

  
  async sendBatchRequest(requests, access_token) {
    try {
      // Meta batch API endpoint
      const batchUrl = `${GRAPH_API_BASE_URL}`;
      
      // Create form data for batch request
      const formData = new URLSearchParams();
      console.log("access_token in batch request:", access_token);
      formData.append('batch', JSON.stringify(requests));
      formData.append('access_token', access_token);

      const response = await axios.post(batchUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 60000,
      });

      return response.data;
    } catch (error) {
      const apiMessage =
        error.response && error.response.data
          ? JSON.stringify(error.response.data)
          : error.message;
      throw new Error(`Batch request failed: ${apiMessage}`);
    }
  }

  /**
   * Split array into chunks of specified size
   * @private
   */
  chunkArray(array, chunkSize = 50) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async getMultiplePageInsights(pageIds, metrics, options = {}) {
    try {
      const { access_token, period = 'day', since, until } = options;

      console.log("access_token:", access_token);

      if (!access_token) {
        throw new Error('Access token is required');
      }

      if (!pageIds || pageIds.length === 0) {
        throw new Error('At least one page ID is required');
      }

      if (!metrics || metrics.length === 0) {
        throw new Error('At least one metric is required');
      }

      // Build query string for insights endpoint
      let queryString = `metric=${metrics.join(',')}&period=${period}`;
      if (since) queryString += `&since=${since}`;
      if (until) queryString += `&until=${until}`;

      // Split into batches of 50
      const pageIdChunks = this.chunkArray(pageIds, 50);
      const allResults = [];

      // Process each batch
      for (let chunkIndex = 0; chunkIndex < pageIdChunks.length; chunkIndex++) {
        const chunk = pageIdChunks[chunkIndex];

        // Build batch requests
        const batchRequests = chunk.map((pageId, index) => ({
          method: 'GET',
          relative_url: `${pageId}/insights?${queryString}`,
          name: `page_${pageId}_${index}`,
        }));

        // Send batch request
        const batchResponses = await this.sendBatchRequest(batchRequests, access_token);

        // Process responses
        for (let i = 0; i < batchResponses.length; i++) {
          const batchResponse = batchResponses[i];
          const pageId = chunk[i];

          if (batchResponse.code && batchResponse.code !== 200) {
            allResults.push({
              success: false,
              pageId,
              error: batchResponse.body ? JSON.parse(batchResponse.body).error : batchResponse,
            });
          } else {
            const body = batchResponse.body ? JSON.parse(batchResponse.body) : batchResponse;
            allResults.push({
              success: true,
              pageId,
              metrics,
              period,
              data: body,
            });
          }
        }
      }

      return allResults;
    } catch (error) {
      throw new Error(`Failed to fetch multiple page insights: ${error.message}`);
    }
  }

  async getMultiplePostInsights(postIds, metrics, options = {}) {
    try {
      const { access_token } = options;

      if (!access_token) {
        throw new Error('Access token is required');
      }

      if (!postIds || postIds.length === 0) {
        throw new Error('At least one post ID is required');
      }

      if (!metrics || metrics.length === 0) {
        throw new Error('At least one metric is required');
      }

      // Build query string for insights endpoint
      const queryString = `metric=${metrics.join(',')}`;

      // Split into batches of 50
      const postIdChunks = this.chunkArray(postIds, 50);
      const allResults = [];

      // Process each batch
      for (let chunkIndex = 0; chunkIndex < postIdChunks.length; chunkIndex++) {
        const chunk = postIdChunks[chunkIndex];

        // Build batch requests
        const batchRequests = chunk.map((postId, index) => ({
          method: 'GET',
          relative_url: `${postId}/insights?${queryString}`,
          name: `post_${postId}_${index}`,
        }));

        // Send batch request
        const batchResponses = await this.sendBatchRequest(batchRequests, access_token);

        // Process responses
        for (let i = 0; i < batchResponses.length; i++) {
          const batchResponse = batchResponses[i];
          const postId = chunk[i];

          if (batchResponse.code && batchResponse.code !== 200) {
            allResults.push({
              success: false,
              postId,
              error: batchResponse.body ? JSON.parse(batchResponse.body).error : batchResponse,
            });
          } else {
            const body = batchResponse.body ? JSON.parse(batchResponse.body) : batchResponse;
            allResults.push({
              success: true,
              postId,
              metrics,
              data: body,
            });
          }
        }
      }

      return allResults;
    } catch (error) {
      throw new Error(`Failed to fetch multiple post insights: ${error.message}`);
    }
  }

  getAvailableMetrics() {
    return {
      pageMetrics: {
        engagement: [
          'page_total_actions',
          'page_engaged_users',
          'page_post_engagements',
          'page_consumptions',
          'page_fan_removes',
          'page_fans',
        ],
        reach: [
          'page_impressions',
          'page_impressions_unique',
          'page_reach',
          'page_reach_by_location',
          'page_reach_by_age_gender',
        ],
        monetization: [
          'content_monetization_earnings',
          'content_monetization_subscriptions',
        ],
        video: [
          'post_video_avg_time_watched',
          'post_video_complete_views_organic',
          'post_video_complete_views_paid',
          'post_video_complete_views_unique_organic',
          'post_video_complete_views_unique_paid',
        ],
      },
      postMetrics: {
        engagement: [
          'post_engaged_users',
          'post_engagement',
          'post_engagements',
          'post_negative_feedback',
          'post_negative_feedback_unique',
          'post_negative_feedback_by_type',
          'post_negative_feedback_by_type_unique',
        ],
        reach: [
          'post_impressions',
          'post_impressions_unique',
          'post_impressions_organic',
          'post_impressions_organic_unique',
          'post_impressions_paid',
          'post_impressions_paid_unique',
        ],
        actions: [
          'post_clicks',
          'post_clicks_by_type',
          'post_video_views',
          'post_video_views_organic',
          'post_video_views_paid',
          'post_video_views_autoplayed',
          'post_video_views_click_to_play',
          'post_video_views_unique',
        ],
      },
    };
  }
}

module.exports = new InsightsService();
