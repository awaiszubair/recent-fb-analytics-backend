const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');
const {
  normalizeRecord,
  normalizeRecords,
  stripUndefined
} = require('../utils/prismaHelpers');

const getThirdPartyDataDelegate = () => getDB().thirdPartyData;

/**
 * Create third-party data record
 * @param {object} data - Data to insert
 * @returns {object} Created record
 */
const createThirdPartyData = async (data) => {
  try {
    const { valid, errors } = validateData('third_party_data', data);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const record = await getThirdPartyDataDelegate().create({
      data: stripUndefined(data)
    });

    return normalizeRecord(record);
  } catch (error) {
    throw new Error(`Error creating third-party data: ${error.message}`);
  }
};

/**
 * Get third-party data for a page
 * @param {string} pageId - UUID of the page
 * @returns {array} Array of data records
 */
const getPageThirdPartyData = async (pageId) => {
  try {
    const data = await getThirdPartyDataDelegate().findMany({
      where: { page_id: pageId },
      orderBy: { synced_at: 'desc' }
    });

    return normalizeRecords(data);
  } catch (error) {
    throw new Error(`Error fetching third-party data for page: ${error.message}`);
  }
};

/**
 * Get third-party data for a post
 * @param {string} postId - UUID of the post
 * @returns {array} Array of data records
 */
const getPostThirdPartyData = async (postId) => {
  try {
    const data = await getThirdPartyDataDelegate().findMany({
      where: { post_id: postId }
    });

    return normalizeRecords(data);
  } catch (error) {
    throw new Error(`Error fetching third-party data for post: ${error.message}`);
  }
};

module.exports = {
  createThirdPartyData,
  getPageThirdPartyData,
  getPostThirdPartyData
};
