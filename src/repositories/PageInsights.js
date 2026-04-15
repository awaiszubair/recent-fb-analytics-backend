const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');
const {
  buildWhere,
  normalizeRecord,
  normalizeRecords,
  stripUndefined,
  upsertByLookup
} = require('../utils/prismaHelpers');

const getPageInsightDelegate = () => getDB().pageInsight;

// Create page insight
const createPageInsight = async (insightData) => {
  try {
    const { valid, errors } = validateData('page_insights', insightData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const insight = await getPageInsightDelegate().create({
      data: stripUndefined(insightData)
    });

    return normalizeRecord(insight);
  } catch (error) {
    throw new Error(`Error creating page insight: ${error.message}`);
  }
};

// Get page insights
const getPageInsights = async (pageId, options = {}) => {
  try {
    const { since, until } = options;
    const endTimeFilter = {
      ...(since ? { gte: since } : {}),
      ...(until ? { lte: until } : {})
    };
    const where = buildWhere({
      page_id: pageId,
      ...(Object.keys(endTimeFilter).length > 0 ? { end_time: endTimeFilter } : {})
    });

    const insights = await getPageInsightDelegate().findMany({
      where,
      orderBy: [
        { end_time: 'desc' },
        { synced_at: 'desc' }
      ]
    });

    return normalizeRecords(insights);
  } catch (error) {
    throw new Error(`Error fetching page insights: ${error.message}`);
  }
};

// Get page insights by metric
const getPageMetrics = async (pageId, metricName, options = {}) => {
  try {
    const { since, until } = options;
    const endTimeFilter = {
      ...(since ? { gte: since } : {}),
      ...(until ? { lte: until } : {})
    };
    const where = buildWhere({
      page_id: pageId,
      metric_name: metricName,
      ...(Object.keys(endTimeFilter).length > 0 ? { end_time: endTimeFilter } : {})
    });

    const metrics = await getPageInsightDelegate().findMany({
      where,
      orderBy: [
        { end_time: 'desc' },
        { synced_at: 'desc' }
      ]
    });

    return normalizeRecords(metrics);
  } catch (error) {
    throw new Error(`Error fetching page metrics: ${error.message}`);
  }
};

// Upsert page insight
const upsertPageInsight = async (insightData) => {
  try {
    const { valid, errors } = validateData('page_insights', insightData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const insight = await upsertByLookup({
      delegate: getPageInsightDelegate(),
      where: buildWhere({
        page_id: insightData.page_id,
        metric_name: insightData.metric_name,
        period: insightData.period,
        end_time: insightData.end_time
      }),
      create: insightData,
      update: insightData
    });

    return normalizeRecord(insight);
  } catch (error) {
    throw new Error(`Error upserting page insight: ${error.message}`);
  }
};

module.exports = { createPageInsight, getPageInsights, getPageMetrics, upsertPageInsight };
