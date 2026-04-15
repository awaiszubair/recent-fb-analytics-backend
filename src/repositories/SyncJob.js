const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');
const {
  normalizeRecord,
  normalizeRecords,
  stripUndefined
} = require('../utils/prismaHelpers');

const getSyncJobDelegate = () => getDB().syncJob;

/**
 * Create a new sync job record
 * @param {object} jobData - Initial job information
 * @returns {object} Created job
 */
const createSyncJob = async (jobData) => {
  try {
    const { valid, errors } = validateData('sync_jobs', jobData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const job = await getSyncJobDelegate().create({
      data: stripUndefined({
        ...jobData,
        status: jobData.status || 'pending'
      })
    });

    return normalizeRecord(job);
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
    const jobs = await getSyncJobDelegate().findMany({
      where: { page_id: pageId },
      orderBy: { created_at: 'desc' }
    });

    return normalizeRecords(jobs);
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
    const cleanedUpdates = stripUndefined(updates);

    if (Object.keys(cleanedUpdates).length === 0) {
      const existing = await getSyncJobDelegate().findUnique({
        where: { id: jobId }
      });

      return normalizeRecord(existing);
    }

    const job = await getSyncJobDelegate().update({
      where: { id: jobId },
      data: cleanedUpdates
    });

    return normalizeRecord(job);
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
    const jobs = await getSyncJobDelegate().findMany({
      where: {
        page_id: pageId,
        job_type: jobType
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    return normalizeRecords(jobs);
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
