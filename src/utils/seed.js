/**
 * Database Seeding Helper
 * Simple utility to insert data into database with schema validation
 *
 * Usage Example:
 * const seedHelper = require('./seed');
 * const partner = await seedHelper.insertPartner({
 *   user_id: 'user_123',
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 */

const { getDB } = require('../config/database');
const { validateData } = require('./schema');
const {
  getTableDelegate,
  normalizeRecord,
  stripUndefined
} = require('./prismaHelpers');

/**
 * Generic insert function with validation
 * @param {string} tableName - Table name
 * @param {object} data - Data to insert
 * @returns {object} Inserted record
 */
const insert = async (tableName, data) => {
  try {
    // Validate data against schema
    const validation = validateData(tableName, data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const delegate = getTableDelegate(getDB(), tableName);
    const insertedData = await delegate.create({
      data: stripUndefined(data)
    });

    console.log(`Record inserted into ${tableName}`);
    return normalizeRecord(insertedData);
  } catch (error) {
    console.error(`Error inserting into ${tableName}:`, error.message);
    throw error;
  }
};

/**
 * Helper methods for each table
 */
const seedHelper = {
  // ============================================================
  // PARTNERS
  // ============================================================
  insertPartner: async (data) => {
    return insert('partners', {
      user_id: data.user_id,
      name: data.name || null,
      email: data.email || null,
      company: data.company || null
    });
  },

  // ============================================================
  // CONNECTED_PAGES
  // ============================================================
  insertConnectedPage: async (data) => {
    return insert('connected_pages', {
      partner_id: data.partner_id,
      fb_page_id: data.fb_page_id,
      page_name: data.page_name || null,
      page_token_encrypted: data.page_token_encrypted || null,
      fan_count: data.fan_count ?? 0,
      is_active: data.is_active !== false,
      last_synced_at: data.last_synced_at || null
    });
  },

  // ============================================================
  // POSTS
  // ============================================================
  insertPost: async (data) => {
    return insert('posts', {
      page_id: data.page_id,
      fb_post_id: data.fb_post_id,
      message: data.message || null,
      type: data.type || null,
      permalink: data.permalink || null,
      created_time: data.created_time || new Date()
    });
  },

  // ============================================================
  // PAGE_INSIGHTS
  // ============================================================
  insertPageInsight: async (data) => {
    return insert('page_insights', {
      page_id: data.page_id,
      metric_name: data.metric_name,
      metric_value: data.metric_value || null,
      period: data.period || null,
      end_time: data.end_time || null
    });
  },

  // ============================================================
  // POST_INSIGHTS
  // ============================================================
  insertPostInsight: async (data) => {
    return insert('post_insights', {
      post_id: data.post_id,
      metric_name: data.metric_name,
      metric_value: data.metric_value || null,
      period: data.period || null,
      end_time: data.end_time || null
    });
  },

  // ============================================================
  // CM_EARNINGS_POST
  // ============================================================
  insertCMEarningsPost: async (data) => {
    return insert('cm_earnings_post', {
      post_id: data.post_id,
      earnings_amount: data.earnings_amount || 0,
      approximate_earnings: data.approximate_earnings || 0,
      currency: data.currency || 'USD',
      period: data.period || null,
      end_time: data.end_time || null
    });
  },

  // ============================================================
  // CM_EARNINGS_PAGE
  // ============================================================
  insertCMEarningsPage: async (data) => {
    return insert('cm_earnings_page', {
      page_id: data.page_id,
      earnings_amount: data.earnings_amount || 0,
      approximate_earnings: data.approximate_earnings || 0,
      content_type_breakdown: data.content_type_breakdown || null,
      currency: data.currency || 'USD',
      period: data.period || null,
      end_time: data.end_time || null
    });
  }
};

module.exports = seedHelper;
