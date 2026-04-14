const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');

// Create connected page
const createPage = async (pageData) => {
  try {
    const { valid, errors } = validateData('connected_pages', pageData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('connected_pages')
      .insert([pageData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error creating page: ${error.message}`);
  }
};

// Get page by ID
const getPageById = async (pageId) => {
  try {
    const { data, error } = await getDB()
      .from('connected_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching page: ${error.message}`);
  }
};

// Get all pages for partner
const getPartnerPages = async (partnerId) => {
  try {
    const { data, error } = await getDB()
      .from('connected_pages')
      .select('*')
      .eq('partner_id', partnerId);

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching pages: ${error.message}`);
  }
};

// Update page
const updatePage = async (pageId, updates) => {
  try {
    const { data, error } = await getDB()
      .from('connected_pages')
      .update(updates)
      .eq('id', pageId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error updating page: ${error.message}`);
  }
};

// Upsert page
const upsertPage = async (pageData) => {
  try {
    const { valid, errors } = validateData('connected_pages', pageData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('connected_pages')
      .upsert(pageData, { onConflict: 'partner_id,fb_page_id' })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error upserting page: ${error.message}`);
  }
};

module.exports = { createPage, getPageById, getPartnerPages, updatePage, upsertPage };
