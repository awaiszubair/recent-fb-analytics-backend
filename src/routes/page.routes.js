const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const pageInsightsController = require('../controllers/page_insights.controller');

// GET /api/v1/pages/:partnerId - Get all pages for partner
router.get('/partner/:partnerId', pageController.getPartnerPages);

// GET /api/v1/pages/:pageId - Get page by ID
router.get('/:pageId', pageController.getPageById);

// POST /api/v1/pages - Create page
router.post('/', pageController.createPage);

// GET /api/v1/pages/:pageId/insights/:since/:until - Get all insights for page
router.get('/:pageId/insights/:since/:until', pageInsightsController.getPageInsights);

// GET /api/v1/pages/:pageId/insights/:metricName/:since/:until - Get specific metric for page
router.get('/:pageId/insights/:metricName/:since/:until', pageInsightsController.getPageMetrics);

// POST /api/v1/pages/:pageId/insights - Create page insight
router.post('/:pageId/insights', pageInsightsController.createPageInsight);

module.exports = router;
