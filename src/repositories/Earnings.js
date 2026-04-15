const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');
const {
  buildWhere,
  normalizeRecord,
  normalizeRecords,
  stripUndefined,
  upsertByLookup
} = require('../utils/prismaHelpers');

const getPostEarningsDelegate = () => getDB().cmEarningsPost;
const getPageEarningsDelegate = () => getDB().cmEarningsPage;

// Create CM earnings for post
const createPostEarnings = async (earningsData) => {
  try {
    const { valid, errors } = validateData('cm_earnings_post', earningsData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const earnings = await getPostEarningsDelegate().create({
      data: stripUndefined(earningsData)
    });

    return normalizeRecord(earnings);
  } catch (error) {
    throw new Error(`Error creating post earnings: ${error.message}`);
  }
};

// Get CM earnings for post
const getPostEarnings = async (postId) => {
  try {
    const earnings = await getPostEarningsDelegate().findMany({
      where: { post_id: postId }
    });

    return normalizeRecords(earnings);
  } catch (error) {
    throw new Error(`Error fetching post earnings: ${error.message}`);
  }
};

// Create CM earnings for page
const createPageEarnings = async (earningsData) => {
  try {
    const { valid, errors } = validateData('cm_earnings_page', earningsData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const earnings = await getPageEarningsDelegate().create({
      data: stripUndefined(earningsData)
    });

    return normalizeRecord(earnings);
  } catch (error) {
    throw new Error(`Error creating page earnings: ${error.message}`);
  }
};

// Get CM earnings for page
const getPageEarnings = async (pageId) => {
  try {
    const earnings = await getPageEarningsDelegate().findMany({
      where: { page_id: pageId },
      orderBy: { end_time: 'desc' }
    });

    return normalizeRecords(earnings);
  } catch (error) {
    throw new Error(`Error fetching page earnings: ${error.message}`);
  }
};

// Upsert CM earnings for post
const upsertPostEarnings = async (earningsData) => {
  try {
    const { valid, errors } = validateData('cm_earnings_post', earningsData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const earnings = await upsertByLookup({
      delegate: getPostEarningsDelegate(),
      where: buildWhere({
        post_id: earningsData.post_id,
        period: earningsData.period,
        end_time: earningsData.end_time
      }),
      create: earningsData,
      update: earningsData
    });

    return normalizeRecord(earnings);
  } catch (error) {
    throw new Error(`Error upserting post earnings: ${error.message}`);
  }
};

// Upsert CM earnings for page
const upsertPageEarnings = async (earningsData) => {
  try {
    const { valid, errors } = validateData('cm_earnings_page', earningsData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const earnings = await upsertByLookup({
      delegate: getPageEarningsDelegate(),
      where: buildWhere({
        page_id: earningsData.page_id,
        period: earningsData.period,
        end_time: earningsData.end_time
      }),
      create: earningsData,
      update: earningsData
    });

    return normalizeRecord(earnings);
  } catch (error) {
    throw new Error(`Error upserting page earnings: ${error.message}`);
  }
};

module.exports = {
  createPostEarnings,
  getPostEarnings,
  createPageEarnings,
  getPageEarnings,
  upsertPostEarnings,
  upsertPageEarnings
};
