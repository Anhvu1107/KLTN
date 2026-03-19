/**
 * Coupon Service
 * AURA ARCHIVE - Business logic for coupons
 */

const { Coupon, CouponUsage, Order, sequelize } = require('../models');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');

/**
 * Get all coupons (admin)
 */
const getAllCoupons = async (options = {}) => {
    const {
        page = 1,
        limit = 20,
        status, // 'active', 'expired', 'all'
    } = options;

    const offset = (page - 1) * limit;
    const where = {};

    if (status === 'active') {
        where.is_active = true;
        where[Op.or] = [
            { expires_at: null },
            { expires_at: { [Op.gt]: new Date() } },
        ];
    } else if (status === 'expired') {
        where[Op.or] = [
            { is_active: false },
            { expires_at: { [Op.lt]: new Date() } },
        ];
    }

    const { count, rows } = await Coupon.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
    });

    return {
        coupons: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};

/**
 * Get coupon by ID
 */
const getCouponById = async (id) => {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) {
        throw new AppError('Coupon not found', 404);
    }
    return coupon;
};

/**
 * Create coupon (admin)
 */
const createCoupon = async (data) => {
    const {
        code,
        name,
        description,
        type,
        value,
        min_order_amount,
        max_discount_amount,
        max_uses,
        max_uses_per_user,
        starts_at,
        expires_at,
        applies_to,
        product_ids,
        category_ids,
    } = data;

    // Check if code already exists
    const existingCoupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });
    if (existingCoupon) {
        throw new AppError('Coupon code already exists', 400);
    }

    const coupon = await Coupon.create({
        code: code.toUpperCase(),
        name,
        description,
        type,
        value,
        min_order_amount: min_order_amount || 0,
        max_discount_amount,
        max_uses,
        max_uses_per_user: max_uses_per_user || 1,
        starts_at,
        expires_at,
        applies_to: applies_to || 'ALL',
        product_ids: product_ids || [],
        category_ids: category_ids || [],
    });

    return coupon;
};

/**
 * Update coupon (admin)
 */
const updateCoupon = async (id, data) => {
    const coupon = await getCouponById(id);

    const updateData = { ...data };
    if (data.code) {
        updateData.code = data.code.toUpperCase();
    }

    await coupon.update(updateData);
    return coupon;
};

/**
 * Delete coupon (admin)
 */
const deleteCoupon = async (id) => {
    const coupon = await getCouponById(id);
    await coupon.destroy();
    return { message: 'Coupon deleted successfully' };
};

/**
 * Validate coupon code
 */
const validateCoupon = async (code, userId, cartTotal, cartItems = []) => {
    const coupon = await Coupon.findOne({
        where: { code: code.toUpperCase() },
    });

    if (!coupon) {
        throw new AppError('Invalid coupon code', 400);
    }

    // Check if active
    if (!coupon.is_active) {
        throw new AppError('This coupon is no longer active', 400);
    }

    // Check start date (compare date only, ignore time/timezone)
    if (coupon.starts_at) {
        const startDate = new Date(coupon.starts_at).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        if (startDate > today) {
            throw new AppError('This coupon is not yet valid', 400);
        }
    }

    // Check expiry (compare date only, ignore time/timezone)
    if (coupon.expires_at) {
        const expiryDate = new Date(coupon.expires_at).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        if (expiryDate < today) {
            throw new AppError('This coupon has expired', 400);
        }
    }

    // Check max uses
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
        throw new AppError('This coupon has reached its usage limit', 400);
    }

    // Check min order amount
    if (cartTotal < parseFloat(coupon.min_order_amount)) {
        throw new AppError(`Minimum order amount is $${coupon.min_order_amount}`, 400);
    }

    // Check user usage limit
    if (userId) {
        const userUsageCount = await CouponUsage.count({
            where: {
                coupon_id: coupon.id,
                user_id: userId,
            },
        });

        if (userUsageCount >= coupon.max_uses_per_user) {
            throw new AppError('You have already used this coupon', 400);
        }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
        discountAmount = (cartTotal * parseFloat(coupon.value)) / 100;
        // Apply max discount cap
        if (coupon.max_discount_amount && discountAmount > parseFloat(coupon.max_discount_amount)) {
            discountAmount = parseFloat(coupon.max_discount_amount);
        }
    } else {
        // FIXED_AMOUNT
        discountAmount = parseFloat(coupon.value);
    }

    // Discount cannot exceed cart total
    if (discountAmount > cartTotal) {
        discountAmount = cartTotal;
    }

    return {
        coupon: {
            id: coupon.id,
            code: coupon.code,
            name: coupon.name,
            type: coupon.type,
            value: coupon.value,
        },
        discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimals
        newTotal: Math.round((cartTotal - discountAmount) * 100) / 100,
    };
};

/**
 * Apply coupon to order (internal use during checkout)
 */
const applyCoupon = async (couponId, userId, orderId, discountAmount) => {
    const coupon = await getCouponById(couponId);

    // Record usage
    await CouponUsage.create({
        coupon_id: couponId,
        user_id: userId,
        order_id: orderId,
        discount_amount: discountAmount,
    });

    // Increment usage count
    await coupon.increment('uses_count');

    return coupon;
};

/**
 * Get coupon usage stats (admin)
 */
const getCouponStats = async (couponId) => {
    const coupon = await getCouponById(couponId);

    const usageStats = await CouponUsage.findAll({
        where: { coupon_id: couponId },
        attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'total_uses'],
            [sequelize.fn('SUM', sequelize.col('discount_amount')), 'total_discount'],
        ],
        raw: true,
    });

    return {
        coupon,
        totalUses: parseInt(usageStats[0]?.total_uses) || 0,
        totalDiscount: parseFloat(usageStats[0]?.total_discount) || 0,
    };
};

module.exports = {
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    applyCoupon,
    getCouponStats,
};
