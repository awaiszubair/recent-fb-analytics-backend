const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/saveFacebookData.controller');

// ─────────────────────────────────────────────
// INITIAL CONNECTION
// ─────────────────────────────────────────────
// The main endpoint /api/v1/facebook/connect
router.post('/', ctrl.initialConnectionSync);

module.exports = router;
