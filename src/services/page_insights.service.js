const PageInsightsModel = require('../models/PageInsights');

// Create page insight
const createPageInsight = async (insightData) => {
  return await PageInsightsModel.createPageInsight(insightData);
};

// Get page insights
const getPageInsights = async (pageId, options = {}) => {
  return await PageInsightsModel.getPageInsights(pageId, options);
};

// Get page insights by metric
const getPageMetrics = async (pageId, metricName, options = {}) => {
  return await PageInsightsModel.getPageMetrics(pageId, metricName, options);
};

module.exports = { createPageInsight, getPageInsights, getPageMetrics };
