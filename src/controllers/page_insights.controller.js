const pageInsightsService = require('../services/page_insights.service');
const formatter = require('../utils/formatter');
const { sendResponse } = require('../utils/response');

// Get page insights by page ID
const getPageInsights = async (req, res, next) => {
  try {
    const { pageId, since, until } = req.params;
    const insights = await pageInsightsService.getPageInsights(pageId, { since, until });
    
    if (!insights || insights.length === 0) {
      return sendResponse(res, 404, 'Page insights not found', null);
    }
    
    // Apply formatter to ensure consistent structure
    const formattedInsights = formatter.formatPageInsights(pageId, insights);
    
    sendResponse(res, 200, 'Page insights retrieved successfully', formattedInsights);
  } catch (error) {
    next(error);
  }
};

// Get page insights by metric
const getPageMetrics = async (req, res, next) => {
  try {
    const { pageId, metricName, since, until } = req.params;
    const metrics = await pageInsightsService.getPageMetrics(pageId, metricName, { since, until });
    
    if (!metrics || metrics.length === 0) {
      return sendResponse(res, 404, 'Page metrics not found', null);
    }
    
    // Apply formatter to ensure consistent structure
    const formattedMetrics = formatter.formatPageInsights(pageId, metrics);
    
    sendResponse(res, 200, 'Page metrics retrieved successfully', formattedMetrics);
  } catch (error) {
    next(error);
  }
};

// Create page insight
const createPageInsight = async (req, res, next) => {
  try {
    const insightData = req.body;
    const insight = await pageInsightsService.createPageInsight(insightData);
    
    // Apply formatter to ensure consistent structure
    const formattedInsight = formatter.formatPageInsights(insightData.page_id, [insight]);
    
    sendResponse(res, 201, 'Page insight created successfully', formattedInsight);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPageInsights, getPageMetrics, createPageInsight };
