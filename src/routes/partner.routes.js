const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partner.controller');

// GET /api/v1/partners - Get all partners
router.get('/', partnerController.getAllPartners);

// GET /api/v1/partners/:partnerId - Get partner by ID
router.get('/:partnerId', partnerController.getPartnerById);

// GET /api/v1/partners/user/:userId - Get partner by user_id
router.get('/user/:userId', partnerController.getPartnerByUserId);

// POST /api/v1/partners - Create partner
router.post('/', partnerController.createPartner);

module.exports = router;
