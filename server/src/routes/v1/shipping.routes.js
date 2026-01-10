/**
 * Shipping Routes
 * AURA ARCHIVE - Shipping API endpoints
 */

const express = require('express');
const router = express.Router();

const shippingController = require('../../controllers/shipping.controller');

router.post('/calculate', shippingController.calculateShipping);
router.get('/rates', shippingController.getShippingRates);

module.exports = router;
