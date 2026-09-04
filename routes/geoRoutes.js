const express = require('express');
const router = express.Router();
const geoController = require('../controllers/geoController');

// Public: the storefront calls this on first load to pick a currency
router.get('/', geoController.getVisitorCountry);

module.exports = router;
