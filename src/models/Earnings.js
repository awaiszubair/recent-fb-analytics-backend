const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');

// Create CM earnings for post
const createPostEarnings = async (earningsData) => {
  try {
    const { valid, errors } = validateData('cm_earnings_post', earningsData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('cm_earnings_post')
      .insert([earningsData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error creating post earnings: ${error.message}`);
  }
};

// Get CM earnings for post
const getPostEarnings = async (postId) => {
  try {
    const { data, error } = await getDB()
      .from('cm_earnings_post')
      .select('*')
      .eq('post_id', postId);

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching post earnings: ${error.message}`);
  }
};

// Create CM earnings for page
const createPageEarnings = async (earningsData) => {
  try {
    const { valid, errors } = validateData('cm_earnings_page', earningsData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('cm_earnings_page')
      .insert([earningsData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error creating page earnings: ${error.message}`);
  }
};

// Get CM earnings for page
const getPageEarnings = async (pageId) => {
  try {
    const { data, error } = await getDB()
      .from('cm_earnings_page')
      .select('*')
      .eq('page_id', pageId)
      .order('end_time', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching page earnings: ${error.message}`);
  }
};

// Upsert CM earnings for post
const upsertPostEarnings = async (earningsData) => {
  try {
    const { valid, errors } = validateData('cm_earnings_post', earningsData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('cm_earnings_post')
      .upsert(earningsData, { onConflict: 'post_id,period,end_time' })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error upserting post earnings: ${error.message}`);
  }
};

// Upsert CM earnings for page
const upsertPageEarnings = async (earningsData) => {
  try {
    const { valid, errors } = validateData('cm_earnings_page', earningsData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('cm_earnings_page')
      .upsert(earningsData, { onConflict: 'page_id,period,end_time' })
      .select();

    if (error) throw error;
    return data[0];
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
