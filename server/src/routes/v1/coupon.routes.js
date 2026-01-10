/**
 * Coupon Routes
 * AURA ARCHIVE - Coupon API endpoints
 */

const express = require('express');
const router = express.Router();

const couponController = require('../../controllers/coupon.controller');
const { authenticate, optionalAuth } = require('../../middlewares/auth.middleware');

// Public route - Validate coupon (optionally authenticated)
router.post('/validate', optionalAuth, couponController.validateCoupon);

module.exports = router;
