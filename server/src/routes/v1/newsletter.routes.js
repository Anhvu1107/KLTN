/**
 * Newsletter Routes
 * AURA ARCHIVE - Newsletter subscription API
 */

const express = require('express');
const router = express.Router();
const newsletterController = require('../../controllers/newsletter.controller');

// POST /api/v1/newsletter/subscribe - Subscribe to newsletter
router.post('/subscribe', newsletterController.subscribe);

// POST /api/v1/newsletter/unsubscribe - Unsubscribe from newsletter  
router.post('/unsubscribe', newsletterController.unsubscribe);

module.exports = router;
