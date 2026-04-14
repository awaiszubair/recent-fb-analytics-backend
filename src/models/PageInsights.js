const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');

// Create page insight
const createPageInsight = async (insightData) => {
  try {
    const { valid, errors } = validateData('page_insights', insightData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('page_insights')
      .insert([insightData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error creating page insight: ${error.message}`);
  }
};

// Get page insights
const getPageInsights = async (pageId, options = {}) => {
  try {
    const { since, until } = options;
    let query = getDB()
      .from('page_insights')
      .select('*')
      .eq('page_id', pageId);

    if (since) query = query.gte('end_time', since);
    if (until) query = query.lte('end_time', until);

    const { data, error } = await query.order('end_time', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching page insights: ${error.message}`);
  }
};

// Get page insights by metric
const getPageMetrics = async (pageId, metricName, options = {}) => {
  try {
    const { since, until } = options;
    let query = getDB()
      .from('page_insights')
      .select('*')
      .eq('page_id', pageId)
      .eq('metric_name', metricName);

    if (since) query = query.gte('end_time', since);
    if (until) query = query.lte('end_time', until);

    const { data, error } = await query;
  } catch (error) {
    throw new Error(`Error fetching page metrics: ${error.message}`);
  }
};

// Upsert page insight
const upsertPageInsight = async (insightData) => {
  try {
    const { valid, errors } = validateData('page_insights', insightData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('page_insights')
      .upsert(insightData, { onConflict: 'page_id,metric_name,period,end_time' })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error upserting page insight: ${error.message}`);
  }
};

module.exports = { createPageInsight, getPageInsights, getPageMetrics, upsertPageInsight };
