const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const postInsightsController = require('../controllers/post_insights.controller');

// GET /api/v1/posts/:postId - Get post by ID
router.get('/:postId', postController.getPostById);

// GET /api/v1/posts/page/:pageId - Get all posts for a page
router.get('/page/:pageId', postController.getPagePosts);

// POST /api/v1/posts - Create post
router.post('/', postController.createPost);

// GET /api/v1/posts/:postId/insights/:since/:until - Get all insights for post
router.get('/:postId/insights/:since/:until', postInsightsController.getPostInsights);

// GET /api/v1/posts/:postId/insights/:metricName/:since/:until - Get specific metric for post
router.get('/:postId/insights/:metricName/:since/:until', postInsightsController.getPostMetrics);

// POST /api/v1/posts/:postId/insights - Create post insight
router.post('/:postId/insights', postInsightsController.createPostInsight);

module.exports = router;
