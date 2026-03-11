/**
 * Contact Routes
 * AURA ARCHIVE - Contact form API
 */

const express = require('express');
const router = express.Router();
const contactController = require('../../controllers/contact.controller');

// POST /api/v1/contact - Submit contact form
router.post('/', contactController.submitContactForm);

module.exports = router;
