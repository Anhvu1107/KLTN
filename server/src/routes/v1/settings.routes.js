/**
 * Settings Routes
 * AURA ARCHIVE - Public settings endpoints
 */

const express = require('express');
const router = express.Router();

const settingsController = require('../../controllers/site-settings.controller');

router.get('/', settingsController.getPublicSettings);
router.get('/product-attributes', settingsController.getProductAttributes);

module.exports = router;
