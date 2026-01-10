/**
 * Settings Routes
 * AURA ARCHIVE - Public settings endpoints
 */

const express = require('express');
const router = express.Router();

const settingsController = require('../../controllers/site-settings.controller');

router.get('/', settingsController.getPublicSettings);

module.exports = router;
