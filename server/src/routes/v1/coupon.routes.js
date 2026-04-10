/**
 * Coupon Routes
 * AURA ARCHIVE - Coupon API endpoints
 */

const express = require('express');
const router = express.Router();

const couponController = require('../../controllers/coupon.controller');
const { optionalAuth, protect } = require('../../middlewares/auth.middleware');

// Public route - Get active PUBLIC coupons
router.get('/public', couponController.getPublicCoupons);

// Public route - Validate coupon (optionally authenticated)
router.post('/validate', optionalAuth, couponController.validateCoupon);

// Authenticated route - Get my coupons (PUBLIC + PERSONAL assigned to me)
router.get('/my', protect, couponController.getMyCoupons);

module.exports = router;
