const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');
const {
  buildWhere,
  normalizeRecord,
  normalizeRecords,
  stripUndefined,
  upsertByLookup
} = require('../utils/prismaHelpers');

const getPostInsightDelegate = () => getDB().postInsight;

// Create post insight
const createPostInsight = async (insightData) => {
  try {
    const { valid, errors } = validateData('post_insights', insightData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const insight = await getPostInsightDelegate().create({
      data: stripUndefined(insightData)
    });

    return normalizeRecord(insight);
  } catch (error) {
    throw new Error(`Error creating post insight: ${error.message}`);
  }
};

// Get post insights
const getPostInsights = async (postId, options = {}) => {
  try {
    const { since, until } = options;
    const endTimeFilter = {
      ...(since ? { gte: since } : {}),
      ...(until ? { lte: until } : {})
    };
    const where = buildWhere({
      post_id: postId,
      ...(Object.keys(endTimeFilter).length > 0 ? { end_time: endTimeFilter } : {})
    });

    const insights = await getPostInsightDelegate().findMany({
      where,
      orderBy: [
        { end_time: 'desc' },
        { synced_at: 'desc' }
      ]
    });

    return normalizeRecords(insights);
  } catch (error) {
    throw new Error(`Error fetching post insights: ${error.message}`);
  }
};

// Get post insights by metric
const getPostMetrics = async (postId, metricName, options = {}) => {
  try {
    const { since, until } = options;
    const endTimeFilter = {
      ...(since ? { gte: since } : {}),
      ...(until ? { lte: until } : {})
    };
    const where = buildWhere({
      post_id: postId,
      metric_name: metricName,
      ...(Object.keys(endTimeFilter).length > 0 ? { end_time: endTimeFilter } : {})
    });

    const metrics = await getPostInsightDelegate().findMany({
      where,
      orderBy: [
        { end_time: 'desc' },
        { synced_at: 'desc' }
      ]
    });

    return normalizeRecords(metrics);
  } catch (error) {
    throw new Error(`Error fetching post metrics: ${error.message}`);
  }
};

// Upsert post insight
const upsertPostInsight = async (insightData) => {
  try {
    const { valid, errors } = validateData('post_insights', insightData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const insight = await upsertByLookup({
      delegate: getPostInsightDelegate(),
      where: buildWhere({
        post_id: insightData.post_id,
        metric_name: insightData.metric_name,
        period: insightData.period,
        end_time: insightData.end_time
      }),
      create: insightData,
      update: insightData
    });

    return normalizeRecord(insight);
  } catch (error) {
    throw new Error(`Error upserting post insight: ${error.message}`);
  }
};

module.exports = { createPostInsight, getPostInsights, getPostMetrics, upsertPostInsight };
