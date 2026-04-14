const express = require('express');
const router = express.Router();
const insightsController = require('../controllers/insights.controller');

// Health check and metrics
router.get('/health', insightsController.healthCheck);
router.get('/metrics', insightsController.getAvailableMetrics);

// User Details
router.post('/user', insightsController.getUserDetails);

// Page Insights
router.post('/pages/batch/:since/:until', insightsController.getMultiplePageInsights);
router.post('/pages/:pageId/:since/:until', insightsController.getPageInsights);

// Post Insights
router.post('/posts/batch/:since/:until', insightsController.getMultiplePostInsights);
router.post('/posts/:postId/:since/:until', insightsController.getPostInsights);

// Post Insights - Comments and Shares Count
router.post('/posts/:postId/comments-count', insightsController.getPostCommentsCount);
router.post('/posts/:postId/shares-count', insightsController.getPostSharesCount);

// Account Insights

module.exports = router;