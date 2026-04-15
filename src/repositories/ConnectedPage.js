const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');
const {
  buildWhere,
  normalizeRecord,
  normalizeRecords,
  stripUndefined,
  upsertByLookup
} = require('../utils/prismaHelpers');

const getPageDelegate = () => getDB().connectedPage;

// Create connected page
const createPage = async (pageData) => {
  try {
    const { valid, errors } = validateData('connected_pages', pageData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const page = await getPageDelegate().create({
      data: stripUndefined(pageData)
    });

    return normalizeRecord(page);
  } catch (error) {
    throw new Error(`Error creating page: ${error.message}`);
  }
};

// Get page by ID
const getPageById = async (pageId) => {
  try {
    const page = await getPageDelegate().findUnique({
      where: { id: pageId }
    });

    return normalizeRecord(page);
  } catch (error) {
    throw new Error(`Error fetching page: ${error.message}`);
  }
};

// Get all pages for partner
const getPartnerPages = async (partnerId) => {
  try {
    const pages = await getPageDelegate().findMany({
      where: { partner_id: partnerId }
    });

    return normalizeRecords(pages);
  } catch (error) {
    throw new Error(`Error fetching pages: ${error.message}`);
  }
};

// Update page
const updatePage = async (pageId, updates) => {
  try {
    const cleanedUpdates = stripUndefined(updates);

    if (Object.keys(cleanedUpdates).length === 0) {
      return getPageById(pageId);
    }

    const page = await getPageDelegate().update({
      where: { id: pageId },
      data: cleanedUpdates
    });

    return normalizeRecord(page);
  } catch (error) {
    throw new Error(`Error updating page: ${error.message}`);
  }
};

// Upsert page
const upsertPage = async (pageData) => {
  try {
    const { valid, errors } = validateData('connected_pages', pageData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const page = await upsertByLookup({
      delegate: getPageDelegate(),
      where: buildWhere({
        partner_id: pageData.partner_id,
        fb_page_id: pageData.fb_page_id
      }),
      create: pageData,
      update: pageData
    });

    return normalizeRecord(page);
  } catch (error) {
    throw new Error(`Error upserting page: ${error.message}`);
  }
};

module.exports = { createPage, getPageById, getPartnerPages, updatePage, upsertPage };
