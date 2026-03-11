/**
 * Location Routes
 * AURA ARCHIVE - Vietnam location API endpoints
 */

const express = require('express');
const router = express.Router();

const locationController = require('../../controllers/location.controller');

router.get('/provinces', locationController.getProvinces);
router.get('/districts/:province', locationController.getDistricts);
router.get('/search', locationController.searchLocations);

module.exports = router;
