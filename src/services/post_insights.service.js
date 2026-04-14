const PostInsightsModel = require('../models/PostInsights');

// Create post insight
const createPostInsight = async (insightData) => {
  return await PostInsightsModel.createPostInsight(insightData);
};

// Get post insights
const getPostInsights = async (postId, options = {}) => {
  return await PostInsightsModel.getPostInsights(postId, options);
};

// Get post insights by metric
const getPostMetrics = async (postId, metricName, options = {}) => {
  return await PostInsightsModel.getPostMetrics(postId, metricName, options);
};

module.exports = { createPostInsight, getPostInsights, getPostMetrics };
