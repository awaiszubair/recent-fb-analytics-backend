const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');

/**
 * Create third-party data record
 * @param {object} data - Data to insert
 * @returns {object} Created record
 */
const createThirdPartyData = async (data) => {
  try {
    const { valid, errors } = validateData('third_party_data', data);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data: result, error } = await getDB()
      .from('third_party_data')
      .insert([data])
      .select();

    if (error) throw error;
    return result[0];
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
    const { data, error } = await getDB()
      .from('third_party_data')
      .select('*')
      .eq('page_id', pageId)
      .order('synced_at', { ascending: false });

    if (error) throw error;
    return data;
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
    const { data, error } = await getDB()
      .from('third_party_data')
      .select('*')
      .eq('post_id', postId);

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching third-party data for post: ${error.message}`);
  }
};

module.exports = {
  createThirdPartyData,
  getPageThirdPartyData,
  getPostThirdPartyData
};
