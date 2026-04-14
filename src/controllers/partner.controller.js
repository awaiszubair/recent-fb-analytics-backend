const partnerService = require('../services/partner.service');
const formatter = require('../utils/formatter');
const { sendResponse } = require('../utils/response');

// Create partner
const createPartner = async (req, res, next) => {
  try {
    const partnerData = req.body;
    const partner = await partnerService.createPartner(partnerData);
    
    // Apply formatter to ensure consistent structure
    const formattedPartner = formatter.formatUserDetails(partner);
    
    sendResponse(res, 201, 'Partner created successfully', formattedPartner);
  } catch (error) {
    next(error);
  }
};

// Get partner by ID
const getPartnerById = async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const partner = await partnerService.getPartnerById(partnerId);
    
    if (!partner) {
      return sendResponse(res, 404, 'Partner not found', null);
    }

    // Apply formatter to ensure consistent structure
    const formattedPartner = formatter.formatUserDetails(partner);
    
    sendResponse(res, 200, 'Partner retrieved successfully', formattedPartner);
  } catch (error) {
    next(error);
  }
};

// Get partner by user_id
const getPartnerByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const partner = await partnerService.getPartnerByUserId(userId);
    
    if (!partner) {
      return sendResponse(res, 404, 'Partner not found', null);
    }

    // Apply formatter to ensure consistent structure
    const formattedPartner = formatter.formatUserDetails(partner);
    
    sendResponse(res, 200, 'Partner retrieved successfully', formattedPartner);
  } catch (error) {
    next(error);
  }
};

// Get all partners
const getAllPartners = async (req, res, next) => {
  try {
    const partners = await partnerService.getAllPartners();
    
    // Apply formatter to each partner for consistent structure
    const formattedPartners = partners.map(partner => formatter.formatUserDetails(partner));
    
    sendResponse(res, 200, 'Partners retrieved successfully', formattedPartners);
  } catch (error) {
    next(error);
  }
};

module.exports = { createPartner, getPartnerById, getPartnerByUserId, getAllPartners };
