const PartnerModel = require('../repositories/Partner');

// Create a new partner
const createPartner = async (partnerData) => {
  return await PartnerModel.createPartner(partnerData);
};

// Get partner by user_id
const getPartnerByUserId = async (userId) => {
  return await PartnerModel.getPartnerByUserId(userId);
};

// Get partner by ID
const getPartnerById = async (partnerId) => {
  return await PartnerModel.getPartnerById(partnerId);
};

// Get all partners
const getAllPartners = async () => {
  return await PartnerModel.getAllPartners();
};

module.exports = { createPartner, getPartnerByUserId, getPartnerById, getAllPartners };
