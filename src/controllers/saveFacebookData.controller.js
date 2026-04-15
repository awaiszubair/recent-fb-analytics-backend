const insightsService = require('../services/insights.service');
const PartnerRepo     = require('../repositories/Partner');
const PageRepo        = require('../repositories/ConnectedPage');
const PostRepo        = require('../repositories/Post');
const PageInsightsRepo= require('../repositories/PageInsights');
const PostInsightsRepo= require('../repositories/PostInsights');
const EarningsRepo    = require('../repositories/Earnings');
const SyncJobRepo     = require('../repositories/SyncJob');
const ThirdPartyRepo  = require('../repositories/ThirdPartyData');

// ─────────────────────────────────────────────
// INITIAL SYNC (Orchestrator)
// ─────────────────────────────────────────────

/**
 * Triggered on /facebook/connect
 * Starts the complete flow: saves Partner, their Pages, and kicks off initial syncs.
 * POST /api/v1/facebook/connect
 * Body: { access_token }
 */
const initialConnectionSync = async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ success: false, message: 'access_token is required' });

    // Call the service to orchestrate the fetching of Partner and Pages
    const Service = require('../services/saveFacebookData.service');
    const result = await Service.initialConnectionSync(access_token);

    return res.status(200).json({ success: true, message: 'Initial connection sync complete', data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// PARTNER
// ─────────────────────────────────────────────

/**
 * Fetch FB user details and save/update as a Partner in DB
 * POST /api/v1/save-facebook/partner
 * Body: { access_token }
 */
const syncPartner = async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ success: false, message: 'access_token is required' });

    const fbUser = await insightsService.getUserDetails({ access_token });
    if (!fbUser.success) throw new Error('Failed to fetch user from Facebook');

    const { id, name, email } = fbUser.data;

    const partner = await PartnerRepo.upsertPartner({
      user_id: id,
      name,
      email
    });

    return res.status(200).json({ success: true, message: 'Partner synced', data: partner });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// CONNECTED PAGE
// ─────────────────────────────────────────────

/**
 * Save a Facebook Page record linked to a partner
 * POST /api/v1/save-facebook/page
 * Body: { partner_id, fb_page_id, page_name, page_token_encrypted, fan_count }
 */
const syncPage = async (req, res) => {
  try {
    const { partner_id, fb_page_id, page_name, page_token_encrypted, fan_count } = req.body;
    if (!partner_id || !fb_page_id) {
      return res.status(400).json({ success: false, message: 'partner_id and fb_page_id are required' });
    }

    const page = await PageRepo.upsertPage({
      partner_id,
      fb_page_id,
      page_name,
      page_token_encrypted,
      fan_count: fan_count || 0,
      is_active: true,
      last_synced_at: new Date()
    });

    return res.status(200).json({ success: true, message: 'Page synced', data: page });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// POSTS
// ─────────────────────────────────────────────

/**
 * Save a single Facebook post to DB
 * POST /api/v1/save-facebook/post
 * Body: { page_id, fb_post_id, message, type, permalink, created_time }
 */
const syncPost = async (req, res) => {
  try {
    const { page_id, fb_post_id, message, type, permalink, created_time } = req.body;
    if (!page_id || !fb_post_id) {
      return res.status(400).json({ success: false, message: 'page_id and fb_post_id are required' });
    }

    const post = await PostRepo.upsertPost({
      page_id,
      fb_post_id,
      message,
      type,
      permalink,
      created_time: created_time ? new Date(created_time) : undefined,
      synced_at: new Date()
    });

    return res.status(200).json({ success: true, message: 'Post synced', data: post });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// PAGE INSIGHTS
// ─────────────────────────────────────────────

/**
 * Fetch page insights from Facebook and save them to DB
 * POST /api/v1/save-facebook/page-insights
 * Body: { page_id, access_token, metrics[], period, since, until }
 */
const syncPageInsights = async (req, res) => {
  try {
    const { page_id, access_token, metrics, period, since, until } = req.body;
    if (!page_id || !access_token) {
      return res.status(400).json({ success: false, message: 'page_id and access_token are required' });
    }

    const defaultMetrics = ['page_impressions', 'page_impressions_unique', 'page_reach', 'page_engaged_users'];
    const fbResponse = await insightsService.getPageInsights(
      page_id,
      metrics || defaultMetrics,
      { access_token, period: period || 'day', since, until }
    );

    if (!fbResponse.success) throw new Error('Failed to fetch page insights from Facebook');

    const results = [];
    for (const insight of fbResponse.data.data) {
      for (const entry of insight.values) {
        const saved = await PageInsightsRepo.upsertPageInsight({
          page_id,
          metric_name: insight.name,
          metric_value: entry.value,
          period: insight.period,
          end_time: entry.end_time ? new Date(entry.end_time) : undefined,
          synced_at: new Date()
        });
        results.push(saved);
      }
    }

    return res.status(200).json({ success: true, message: `${results.length} page insights synced`, count: results.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// POST INSIGHTS
// ─────────────────────────────────────────────

/**
 * Fetch post insights from Facebook and save them to DB
 * POST /api/v1/save-facebook/post-insights
 * Body: { post_id, fb_post_id, access_token, metrics[] }
 */
const syncPostInsights = async (req, res) => {
  try {
    const { post_id, fb_post_id, access_token, metrics } = req.body;
    if (!post_id || !fb_post_id || !access_token) {
      return res.status(400).json({ success: false, message: 'post_id, fb_post_id, and access_token are required' });
    }

    const defaultMetrics = ['post_impressions', 'post_impressions_unique', 'post_engaged_users', 'post_clicks'];
    const fbResponse = await insightsService.getPostInsights(
      fb_post_id,
      metrics || defaultMetrics,
      { access_token }
    );

    if (!fbResponse.success) throw new Error('Failed to fetch post insights from Facebook');

    const results = [];
    for (const insight of fbResponse.data.data) {
      for (const entry of insight.values) {
        const saved = await PostInsightsRepo.upsertPostInsight({
          post_id,
          metric_name: insight.name,
          metric_value: entry.value,
          period: insight.period || null,
          end_time: entry.end_time ? new Date(entry.end_time) : undefined,
          synced_at: new Date()
        });
        results.push(saved);
      }
    }

    return res.status(200).json({ success: true, message: `${results.length} post insights synced`, count: results.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// EARNINGS
// ─────────────────────────────────────────────

/**
 * Save CM earnings for a page to DB
 * POST /api/v1/save-facebook/earnings/page
 * Body: { page_id, earnings_amount, approximate_earnings, currency, period, end_time, content_type_breakdown }
 */
const syncPageEarnings = async (req, res) => {
  try {
    const { page_id, earnings_amount, approximate_earnings, currency, period, end_time, content_type_breakdown } = req.body;
    if (!page_id) return res.status(400).json({ success: false, message: 'page_id is required' });

    const earnings = await EarningsRepo.upsertPageEarnings({
      page_id,
      earnings_amount: earnings_amount || 0,
      approximate_earnings: approximate_earnings || 0,
      currency: currency || 'USD',
      period,
      end_time: end_time ? new Date(end_time) : undefined,
      content_type_breakdown: content_type_breakdown || null,
      synced_at: new Date()
    });

    return res.status(200).json({ success: true, message: 'Page earnings synced', data: earnings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Save CM earnings for a post to DB
 * POST /api/v1/save-facebook/earnings/post
 * Body: { post_id, earnings_amount, approximate_earnings, currency, period, end_time }
 */
const syncPostEarnings = async (req, res) => {
  try {
    const { post_id, earnings_amount, approximate_earnings, currency, period, end_time } = req.body;
    if (!post_id) return res.status(400).json({ success: false, message: 'post_id is required' });

    const earnings = await EarningsRepo.upsertPostEarnings({
      post_id,
      earnings_amount: earnings_amount || 0,
      approximate_earnings: approximate_earnings || 0,
      currency: currency || 'USD',
      period,
      end_time: end_time ? new Date(end_time) : undefined,
      synced_at: new Date()
    });

    return res.status(200).json({ success: true, message: 'Post earnings synced', data: earnings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// SYNC JOBS
// ─────────────────────────────────────────────

/**
 * Create a new sync job record
 * POST /api/v1/save-facebook/sync-job
 * Body: { page_id, job_type }
 */
const createSyncJob = async (req, res) => {
  try {
    const { page_id, job_type } = req.body;
    if (!page_id || !job_type) {
      return res.status(400).json({ success: false, message: 'page_id and job_type are required' });
    }

    const job = await SyncJobRepo.createSyncJob({
      page_id,
      job_type,
      status: 'pending',
      started_at: new Date()
    });

    return res.status(201).json({ success: true, message: 'Sync job created', data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update status of a sync job (complete or fail)
 * PATCH /api/v1/save-facebook/sync-job/:jobId
 * Body: { status, error_log }
 */
const updateSyncJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, error_log } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });

    const job = await SyncJobRepo.updateSyncJob(jobId, {
      status,
      error_log: error_log || null,
      completed_at: ['completed', 'failed'].includes(status) ? new Date() : undefined
    });

    return res.status(200).json({ success: true, message: 'Sync job updated', data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// THIRD PARTY DATA
// ─────────────────────────────────────────────

/**
 * Save third-party data for a page or post
 * POST /api/v1/save-facebook/third-party
 * Body: { page_id?, post_id?, data_type, value }
 */
const saveThirdPartyData = async (req, res) => {
  try {
    const { page_id, post_id, data_type, value } = req.body;
    if (!data_type || (!page_id && !post_id)) {
      return res.status(400).json({ success: false, message: 'data_type and at least one of page_id or post_id are required' });
    }

    const record = await ThirdPartyRepo.createThirdPartyData({
      page_id: page_id || null,
      post_id: post_id || null,
      data_type,
      value,
      synced_at: new Date()
    });

    return res.status(201).json({ success: true, message: 'Third-party data saved', data: record });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  initialConnectionSync,
  syncPartner,
  syncPage,
  syncPost,
  syncPageInsights,
  syncPostInsights,
  syncPageEarnings,
  syncPostEarnings,
  createSyncJob,
  updateSyncJob,
  saveThirdPartyData
};
