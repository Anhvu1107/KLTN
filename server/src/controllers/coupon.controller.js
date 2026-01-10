/**
 * Coupon Controller
 * AURA ARCHIVE - Handle HTTP requests for coupons
 */

const couponService = require('../services/coupon.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/admin/coupons
 * Get all coupons (admin)
 */
const getAllCoupons = catchAsync(async (req, res) => {
    const result = await couponService.getAllCoupons(req.query);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/admin/coupons/:id
 * Get coupon by ID (admin)
 */
const getCouponById = catchAsync(async (req, res) => {
    const coupon = await couponService.getCouponById(req.params.id);

    res.status(200).json({
        success: true,
        data: { coupon },
    });
});

/**
 * POST /api/v1/admin/coupons
 * Create coupon (admin)
 */
const createCoupon = catchAsync(async (req, res) => {
    const coupon = await couponService.createCoupon(req.body);

    res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        data: { coupon },
    });
});

/**
 * PUT /api/v1/admin/coupons/:id
 * Update coupon (admin)
 */
const updateCoupon = catchAsync(async (req, res) => {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);

    res.status(200).json({
        success: true,
        message: 'Coupon updated successfully',
        data: { coupon },
    });
});

/**
 * DELETE /api/v1/admin/coupons/:id
 * Delete coupon (admin)
 */
const deleteCoupon = catchAsync(async (req, res) => {
    await couponService.deleteCoupon(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Coupon deleted successfully',
    });
});

/**
 * POST /api/v1/coupons/validate
 * Validate coupon code (public, requires auth for user-specific validation)
 */
const validateCoupon = catchAsync(async (req, res) => {
    const { code, cartTotal, cartItems } = req.body;
    const userId = req.user?.id;

    const result = await couponService.validateCoupon(code, userId, cartTotal, cartItems);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/admin/coupons/:id/stats
 * Get coupon usage stats (admin)
 */
const getCouponStats = catchAsync(async (req, res) => {
    const result = await couponService.getCouponStats(req.params.id);

    res.status(200).json({
        success: true,
        data: result,
    });
});

module.exports = {
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    getCouponStats,
};
