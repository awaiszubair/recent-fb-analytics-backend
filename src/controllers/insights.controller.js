const insightsService = require('../services/insights.service');
const formatter = require('../utils/formatter');
const { successResponse, errorResponse } = require('../utils/response');

exports.getPageInsights = async (req, res, next) => {
  try {
    const { pageId, since, until } = req.params;
    const { metrics, access_token, period } = req.body;

    if (!pageId) {
      return errorResponse(res, 'Page ID is required', 400);
    }

    if (!metrics) {
      return errorResponse(
        res,
        'Metrics are required (comma-separated string or array)',
        400
      );
    }

    if (!access_token) {
      return errorResponse(res, 'Access token is required', 400);
    }

    // Parse metrics from comma-separated string or array
    const metricArray = Array.isArray(metrics)
      ? metrics
      : metrics.split(',').map((m) => m.trim());

    const result = await insightsService.getPageInsights(pageId, metricArray, {
      access_token,
      period,
      since,
      until,
    });

    // Apply formatter to normalize response
    const formattedData = formatter.formatPageInsights(pageId, result.data);

    return successResponse(res, {
      pageId,
      metrics: metricArray,
      period,
      formatted_count: formattedData.length,
      data: formattedData
    }, 'Page insights retrieved successfully');
  } catch (error) {
    console.error('Error fetching page insights:', error);
    return errorResponse(res, error.message, 500, error);
  }
};


exports.getPostInsights = async (req, res, next) => {
  try {
    const { postId, since, until } = req.params;
    const { metrics, access_token } = req.body;

    if (!postId) {
      return errorResponse(res, 'Post ID is required', 400);
    }

    if (!metrics) {
      return errorResponse(
        res,
        'Metrics are required (comma-separated string or array)',
        400
      );
    }

    if (!access_token) {
      return errorResponse(res, 'Access token is required', 400);
    }

    // Parse metrics from comma-separated string or array
    const metricArray = Array.isArray(metrics)
      ? metrics
      : metrics.split(',').map((m) => m.trim());

    const result = await insightsService.getPostInsights(postId, metricArray, {
      access_token,
      since,
      until
    });

    // Apply formatter to normalize response
    const formattedData = formatter.formatPostInsights(postId, result.data);

    return successResponse(res, {
      postId,
      metrics: metricArray,
      formatted_count: formattedData.length,
      data: formattedData
    }, 'Post insights retrieved successfully');
  } catch (error) {
    console.error('Error fetching post insights:', error);
    return errorResponse(res, error.message, 500, error);
  }
};

exports.getMultiplePageInsights = async (req, res, next) => {
  try {
    const { since, until } = req.params;
    const { pageIds, metrics, access_token, options = {} } = req.body;

    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return errorResponse(
        res,
        'pageIds array is required and must not be empty',
        400
      );
    }

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return errorResponse(
        res,
        'metrics array is required and must not be empty',
        400
      );
    }

    if (!access_token) {
      return errorResponse(res, 'Access token is required', 400);
    }

    const result = await insightsService.getMultiplePageInsights(
      pageIds,
      metrics,
      {
        access_token,
        since,
        until,
        ...options,
      }
    );

    // Apply formatter to each result
    const formattedResults = result.map(item => {
      if (item.success && item.data) {
        return {
          ...item,
          data: formatter.formatPageInsights(item.pageId, item.data)
        };
      }
      return item;
    });

    return successResponse(
      res,
      formattedResults,
      'Multiple page insights retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching multiple page insights:', error);
    return errorResponse(res, error.message, 500, error);
  }
};

exports.getMultiplePostInsights = async (req, res, next) => {
  try {
    const { since, until } = req.params;
    const { postIds, metrics, access_token } = req.body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return errorResponse(
        res,
        'postIds array is required and must not be empty',
        400
      );
    }

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return errorResponse(
        res,
        'metrics array is required and must not be empty',
        400
      );
    }

    if (!access_token) {
      return errorResponse(res, 'Access token is required', 400);
    }

    const result = await insightsService.getMultiplePostInsights(
      postIds,
      metrics,
      {
        access_token,
        since,
        until
      }
    );

    // Apply formatter to each result
    const formattedResults = result.map(item => {
      if (item.success && item.data) {
        return {
          ...item,
          data: formatter.formatPostInsights(item.postId, item.data)
        };
      }
      return item;
    });

    return successResponse(
      res,
      formattedResults,
      'Multiple post insights retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching multiple post insights:', error);
    return errorResponse(res, error.message, 500, error);
  }
};

exports.getAvailableMetrics = (req, res, next) => {
  try {
    const metrics = insightsService.getAvailableMetrics();
    return successResponse(res, metrics, 'Available metrics retrieved');
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return errorResponse(res, error.message, 500, error);
  }
};

exports.getPostCommentsCount = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { access_token } = req.body;

    if (!postId) {
      return errorResponse(res, 'Post ID is required', 400);
    }

    if (!access_token) {
      return errorResponse(res, 'Access token is required', 400);
    }

    const result = await insightsService.getPostCommentsCount(postId, {
      access_token,
    });

    // Apply formatter to normalize response
    const formattedData = formatter.formatCommentsCount(postId, result.data);

    return successResponse(res, formattedData, 'Post comments count retrieved successfully');
  } catch (error) {
    console.error('Error fetching post comments count:', error);
    return errorResponse(res, error.message, 500, error);
  }
};

exports.getPostSharesCount = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { access_token } = req.body;

    if (!postId) {
      return errorResponse(res, 'Post ID is required', 400);
    }

    if (!access_token) {
      return errorResponse(res, 'Access token is required', 400);
    }

    const result = await insightsService.getPostSharesCount(postId, {
      access_token,
    });

    // Apply formatter to normalize response
    const formattedData = formatter.formatSharesCount(postId, result.data);

    return successResponse(res, formattedData, 'Post shares count retrieved successfully');
  } catch (error) {
    console.error('Error fetching post shares count:', error);
    return errorResponse(res, error.message, 500, error);
  }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const { access_token, fields } = req.body;

    if (!access_token) {
      return errorResponse(res, 'Access token is required', 400);
    }

    const result = await insightsService.getUserDetails({
      access_token,
      fields: fields || 'id,name,email,picture',
    });

    // Apply formatter to normalize response
    const formattedData = formatter.formatUserDetails(result.data);

    return successResponse(res, formattedData, 'User details retrieved successfully');
  } catch (error) {
    console.error('Error fetching user details:', error);
    return errorResponse(res, error.message, 500, error);
  }
};

exports.healthCheck = (req, res, next) => {
  try {
    return successResponse(res, { status: 'healthy' }, 'Insights service is healthy');
  } catch (error) {
    return errorResponse(res, error.message, 500, error);
  }
};
