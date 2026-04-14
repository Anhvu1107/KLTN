/**
 * Popup Routes
 * AURA ARCHIVE - Public popup endpoints
 */

const express = require('express');
const router = express.Router();

const popupController = require('../../controllers/popup.controller');

router.get('/', popupController.getActivePopups);

module.exports = router;
