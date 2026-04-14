const pageService = require('../services/page.service');
const formatter = require('../utils/formatter');
const { sendResponse } = require('../utils/response');

// Get page by ID
const getPageById = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const page = await pageService.getPageById(pageId);
    
    if (!page) {
      return sendResponse(res, 404, 'Page not found', null);
    }

    // Apply formatter to ensure consistent structure
    const formattedPage = formatter.formatConnectedPage(page.partner_id, page);
    
    sendResponse(res, 200, 'Page retrieved successfully', formattedPage);
  } catch (error) {
    next(error);
  }
};

// Get all pages for partner
const getPartnerPages = async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const pages = await pageService.getPartnerPages(partnerId);
    
    // Apply formatter to each page for consistent structure
    const formattedPages = pages.map(page => formatter.formatConnectedPage(partnerId, page));
    
    sendResponse(res, 200, 'Pages retrieved successfully', formattedPages);
  } catch (error) {
    next(error);
  }
};

// Create page
const createPage = async (req, res, next) => {
  try {
    const pageData = req.body;
    const page = await pageService.createConnectedPage(pageData);
    
    // Apply formatter to ensure consistent structure
    const formattedPage = formatter.formatConnectedPage(page.partner_id, page);
    
    sendResponse(res, 201, 'Page created successfully', formattedPage);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPageById, getPartnerPages, createPage };
