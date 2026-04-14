const { getDB } = require('../config/database');
const { validateData } = require('../utils/schema');

// Create a new partner
const createPartner = async (partnerData) => {
  try {
    const { valid, errors } = validateData('partners', partnerData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('partners')
      .insert([partnerData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error creating partner: ${error.message}`);
  }
};

// Get partner by user_id
const getPartnerByUserId = async (userId) => {
  try {
    const { data, error } = await getDB()
      .from('partners')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching partner: ${error.message}`);
  }
};

// Get partner by ID
const getPartnerById = async (partnerId) => {
  try {
    const { data, error } = await getDB()
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching partner: ${error.message}`);
  }
};

// Get all partners
const getAllPartners = async () => {
  try {
    const { data, error } = await getDB()
      .from('partners')
      .select('*');

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Error fetching partners: ${error.message}`);
  }
};

// Update partner
const updatePartner = async (partnerId, updates) => {
  try {
    const { data, error } = await getDB()
      .from('partners')
      .update(updates)
      .eq('id', partnerId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw new Error(`Error updating partner: ${error.message}`);
  }
};

// Upsert partner (create if not exists, otherwise update)
const upsertPartner = async (partnerData) => {
  try {
    const { valid, errors } = validateData('partners', partnerData);
    if (!valid) throw new Error(`Validation failed: ${errors.join(', ')}`);

    const { data, error } = await getDB()
      .from('partners')
      .upsert(partnerData, { onConflict: 'user_id' })
      .select();

    if (error) throw error;
    return data[0];
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
