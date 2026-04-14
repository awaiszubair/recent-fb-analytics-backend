const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');

/**
 * Create a new sync job record
 * @param {object} jobData - Initial job information
 * @returns {object} Created job
 */
const createSyncJob = async (jobData) => {
  try {
    const { valid, errors } = validateData('sync_jobs', jobData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('sync_jobs')
      .insert([{
        ...jobData,
        status: jobData.status || 'pending',
        created_at: new Date()
      }])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error creating sync job: ${error.message}`);
  }
};

/**
 * Get sync jobs for a page
 * @param {string} pageId - UUID of the page
 * @returns {array} List of sync jobs
 */
const getPageSyncJobs = async (pageId) => {
  try {
    const { data, error } = await getDB()
      .from('sync_jobs')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching sync jobs: ${error.message}`);
  }
};

/**
 * Update a sync job status/progress
 * @param {string} jobId - UUID of the job
 * @param {object} updates - Status updates (status, completed_at, error_log)
 * @returns {object} Updated job
 */
const updateSyncJob = async (jobId, updates) => {
  try {
    const { data, error } = await getDB()
      .from('sync_jobs')
      .update(updates)
      .eq('id', jobId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error updating sync job: ${error.message}`);
  }
};

/**
 * Get recent sync jobs of a specific type
 * @param {string} pageId - Page UUID
 * @param {string} jobType - job type
 * @returns {array} List of sync jobs
 */
const getRecentJobsByType = async (pageId, jobType) => {
  try {
    const { data, error } = await getDB()
      .from('sync_jobs')
      .select('*')
      .eq('page_id', pageId)
      .eq('job_type', jobType)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching recent jobs: ${error.message}`);
  }
};

module.exports = {
  createSyncJob,
  getPageSyncJobs,
  updateSyncJob,
  getRecentJobsByType
};
