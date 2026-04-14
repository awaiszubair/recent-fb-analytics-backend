const PageModel = require('../models/ConnectedPage');

// Create a new page
const createConnectedPage = async (pageData) => {
  return await PageModel.createPage(pageData);
};

// Get page by ID
const getPageById = async (pageId) => {
  return await PageModel.getPageById(pageId);
};

// Get all pages for partner
const getPartnerPages = async (partnerId) => {
  return await PageModel.getPartnerPages(partnerId);
};

// Update page
const updatePage = async (pageId, updates) => {
  return await PageModel.updatePage(pageId, updates);
};

module.exports = { createConnectedPage, getPageById, getPartnerPages, updatePage };
