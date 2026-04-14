/**
 * Example: Using Formatter in Insights Controller
 * 
 * Complete flow:
 * 1. Controller receives request
 * 2. Service calls Meta API
 * 3. Formatter normalizes response
 * 4. Seed helper validates and inserts into DB
 */

const insightsService = require('../services/insights.service');
const seedHelper = require('../utils/seed');
const { validateData } = require('../utils/schema');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Example: Get and save page insights
 */
exports.getAndSavePageInsights = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const { metrics, access_token } = req.body;

    if (!pageId) {
      return errorResponse(res, 'Page ID is required', 400);
    }

    // 1️⃣ Call Meta API (returns formatted data via formatter)
    const insightResult = await insightsService.getPageInsights(pageId, metrics || ['page_impressions'], {
      access_token,
    });

    if (!insightResult.success) {
      return errorResponse(res, insightResult.error || 'Failed to fetch insights', 500);
    }

    // 2️⃣ Get page_id from connected_pages table (normally done via lookup)
    // This is pseudo-code - you'd get the actual UUID from database
    const dbPageId = 'actual-page-uuid-from-db';

    // 3️⃣ Save each insight to database
    const savedInsights = [];
    for (const insight of insightResult.data) {
      try {
        // Validate against schema
        const validation = validateData('page_insights', {
          page_id: dbPageId,
          metric_name: insight.metric_name,
          metric_value: insight.metric_value,
          period: insight.period,
          end_time: insight.end_time
        });

        if (!validation.valid) {
          console.warn('Insight validation warning:', validation.errors);
          // Continue anyway - schema has defaults
        }

        // Insert using seed helper
        const saved = await seedHelper.insertPageInsight({
          page_id: dbPageId,
          metric_name: insight.metric_name,
          metric_value: insight.metric_value,
          period: insight.period,
          end_time: insight.end_time
        });

        savedInsights.push(saved);
      } catch (error) {
        console.error('Error saving individual insight:', error.message);
        // Continue with next insight
      }
    }

    return successResponse(
      res,
      {
        fetched: insightResult.data.length,
        saved: savedInsights.length,
        insights: savedInsights
      },
      'Page insights fetched and saved successfully'
    );
  } catch (error) {
    console.error('Error in getAndSavePageInsights:', error);
    return errorResponse(res, error.message, 500, error);
  }
};

/**
 * Example: Get and save post comments and shares
 */
exports.getAndSavePostMetadata = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { access_token } = req.body;

    if (!postId) {
      return errorResponse(res, 'Post ID is required', 400);
    }

    const dbPostId = 'actual-post-uuid-from-db';
    const results = {};

    // Fetch comments count
    try {
      const commentsResult = await insightsService.getPostCommentsCount(postId, { access_token });
      if (commentsResult.success) {
        await seedHelper.insertPostInsight({
          post_id: dbPostId,
          metric_name: commentsResult.data.metric_name,
          metric_value: commentsResult.data.metric_value
        });
        results.comments = commentsResult.data;
      }
    } catch (error) {
      console.error('Error fetching comments:', error.message);
    }

    // Fetch shares count
    try {
      const sharesResult = await insightsService.getPostSharesCount(postId, { access_token });
      if (sharesResult.success) {
        await seedHelper.insertPostInsight({
          post_id: dbPostId,
          metric_name: sharesResult.data.metric_name,
          metric_value: sharesResult.data.metric_value
        });
        results.shares = sharesResult.data;
      }
    } catch (error) {
      console.error('Error fetching shares:', error.message);
    }

    return successResponse(
      res,
      results,
      'Post metadata fetched and saved successfully'
    );
  } catch (error) {
    console.error('Error in getAndSavePostMetadata:', error);
    return errorResponse(res, error.message, 500, error);
  }
};

/**
 * Example: Sync connected page details
 */
exports.syncPageDetails = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const { fb_page_id, access_token, partner_id } = req.body;

    if (!fb_page_id || !access_token) {
      return errorResponse(res, 'fb_page_id and access_token required', 400);
    }

    // Fetch page details from Meta (using insights service pattern)
    const pageDetails = await axios.get(
      `${GRAPH_API_BASE_URL}/${fb_page_id}`,
      { 
        params: { 
          access_token,
          fields: 'id,name,fan_count' 
        },
        timeout: 30000
      }
    );

    // Format using formatter
    const formatter = require('../utils/formatter');
    const formattedPage = formatter.formatConnectedPage(partner_id, pageDetails.data);

    // Save to database
    const updated = await ConnectedPageModel.updatePage(pageId, formattedPage);

    return successResponse(
      res,
      updated,
      'Page details synced successfully'
    );
  } catch (error) {
    console.error('Error in syncPageDetails:', error);
    return errorResponse(res, error.message, 500, error);
  }
};

module.exports = {
  getAndSavePageInsights,
  getAndSavePostMetadata,
  syncPageDetails
};
