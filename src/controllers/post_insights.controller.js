const postInsightsService = require('../services/post_insights.service');
const formatter = require('../utils/formatter');
const { sendResponse } = require('../utils/response');

// Get post insights by post ID
const getPostInsights = async (req, res, next) => {
  try {
    const { postId, since, until } = req.params;
    const insights = await postInsightsService.getPostInsights(postId, { since, until });
    
    if (!insights || insights.length === 0) {
      return sendResponse(res, 404, 'Post insights not found', null);
    }
    
    // Apply formatter to ensure consistent structure
    const formattedInsights = formatter.formatPostInsights(postId, insights);
    
    sendResponse(res, 200, 'Post insights retrieved successfully', formattedInsights);
  } catch (error) {
    next(error);
  }
};

// Get post insights by metric
const getPostMetrics = async (req, res, next) => {
  try {
    const { postId, metricName, since, until } = req.params;
    const metrics = await postInsightsService.getPostMetrics(postId, metricName, { since, until });
    
    if (!metrics || metrics.length === 0) {
      return sendResponse(res, 404, 'Post metrics not found', null);
    }
    
    // Apply formatter to ensure consistent structure
    const formattedMetrics = formatter.formatPostInsights(postId, metrics);
    
    sendResponse(res, 200, 'Post metrics retrieved successfully', formattedMetrics);
  } catch (error) {
    next(error);
  }
};

// Create post insight
const createPostInsight = async (req, res, next) => {
  try {
    const insightData = req.body;
    const insight = await postInsightsService.createPostInsight(insightData);
    
    // Apply formatter to ensure consistent structure
    const formattedInsight = formatter.formatPostInsights(insightData.post_id, [insight]);
    
    sendResponse(res, 201, 'Post insight created successfully', formattedInsight);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPostInsights, getPostMetrics, createPostInsight };
