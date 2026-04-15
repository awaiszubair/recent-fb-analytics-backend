const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');
const {
  buildWhere,
  normalizeRecord,
  normalizeRecords,
  stripUndefined,
  upsertByLookup
} = require('../utils/prismaHelpers');

const getPartnerDelegate = () => getDB().partner;

// Create a new partner
const createPartner = async (partnerData) => {
  try {
    const { valid, errors } = validateData('partners', partnerData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const partner = await getPartnerDelegate().create({
      data: stripUndefined(partnerData)
    });

    return normalizeRecord(partner);
  } catch (error) {
    throw new Error(`Error creating partner: ${error.message}`);
  }
};

// Get partner by user_id
const getPartnerByUserId = async (userId) => {
  try {
    const partner = await getPartnerDelegate().findUnique({
      where: { user_id: userId }
    });

    return normalizeRecord(partner);
  } catch (error) {
    throw new Error(`Error fetching partner: ${error.message}`);
  }
};

// Get partner by ID
const getPartnerById = async (partnerId) => {
  try {
    const partner = await getPartnerDelegate().findUnique({
      where: { id: partnerId }
    });

    return normalizeRecord(partner);
  } catch (error) {
    throw new Error(`Error fetching partner: ${error.message}`);
  }
};

// Get all partners
const getAllPartners = async () => {
  try {
    const partners = await getPartnerDelegate().findMany();
    return normalizeRecords(partners);
  } catch (error) {
    throw new Error(`Error fetching partners: ${error.message}`);
  }
};

// Update partner
const updatePartner = async (partnerId, updates) => {
  try {
    const cleanedUpdates = stripUndefined(updates);

    if (Object.keys(cleanedUpdates).length === 0) {
      return getPartnerById(partnerId);
    }

    const partner = await getPartnerDelegate().update({
      where: { id: partnerId },
      data: cleanedUpdates
    });

    return normalizeRecord(partner);
  } catch (error) {
    throw new Error(`Error updating partner: ${error.message}`);
  }
};

// Upsert partner (create if not exists, otherwise update)
const upsertPartner = async (partnerData) => {
  try {
    const { valid, errors } = validateData('partners', partnerData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const partner = await upsertByLookup({
      delegate: getPartnerDelegate(),
      where: buildWhere({ user_id: partnerData.user_id }),
      create: partnerData,
      update: partnerData
    });

    return normalizeRecord(partner);
  } catch (error) {
    throw new Error(`Error upserting partner: ${error.message}`);
  }
};

module.exports = {
  createPartner,
  getPartnerByUserId,
  getPartnerById,
  getAllPartners,
  updatePartner,
  upsertPartner
};
