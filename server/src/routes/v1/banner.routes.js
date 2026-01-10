/**
 * Banner Routes
 * AURA ARCHIVE - Banner API endpoints
 */

const express = require('express');
const router = express.Router();

const bannerController = require('../../controllers/banner.controller');

// Public route - Get active banners
router.get('/', bannerController.getActiveBanners);

module.exports = router;
