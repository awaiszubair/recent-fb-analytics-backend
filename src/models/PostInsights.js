const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');

// Create post insight
const createPostInsight = async (insightData) => {
  try {
    const { valid, errors } = validateData('post_insights', insightData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('post_insights')
      .insert([insightData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error creating post insight: ${error.message}`);
  }
};

// Get post insights
const getPostInsights = async (postId, options = {}) => {
  try {
    const { since, until } = options;
    let query = getDB()
      .from('post_insights')
      .select('*')
      .eq('post_id', postId);

    if (since) query = query.gte('end_time', since);
    if (until) query = query.lte('end_time', until);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching post insights: ${error.message}`);
  }
};

// Get post insights by metric
const getPostMetrics = async (postId, metricName, options = {}) => {
  try {
    const { since, until } = options;
    let query = getDB()
      .from('post_insights')
      .select('*')
      .eq('post_id', postId)
      .eq('metric_name', metricName);

    if (since) query = query.gte('end_time', since);
    if (until) query = query.lte('end_time', until);

    const { data, error } = await query;
  } catch (error) {
    throw new Error(`Error fetching post metrics: ${error.message}`);
  }
};

// Upsert post insight
const upsertPostInsight = async (insightData) => {
  try {
    const { valid, errors } = validateData('post_insights', insightData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('post_insights')
      .upsert(insightData, { onConflict: 'post_id,metric_name,period,end_time' })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error upserting post insight: ${error.message}`);
  }
};

module.exports = { createPostInsight, getPostInsights, getPostMetrics, upsertPostInsight };
