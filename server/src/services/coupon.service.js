/**
 * Coupon Service
 * AURA ARCHIVE - Business logic for coupons
 */

const { Coupon, CouponUsage, CouponAssignment, User, sequelize } = require('../models');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');

const SHIPPING_COUPON_TYPE = 'FREE_SHIPPING';
const BENEFIT_TYPES = {
    DISCOUNT: 'DISCOUNT',
    SHIPPING: 'SHIPPING',
};

const activeConditions = () => ({
    is_active: true,
    [Op.or]: [
        { expires_at: null },
        { expires_at: { [Op.gt]: new Date() } },
    ],
});

const roundCurrency = (value) => Math.round(Number(value || 0) * 100) / 100;

const getCouponBenefitType = (coupon) => (
    coupon?.type === SHIPPING_COUPON_TYPE
        ? BENEFIT_TYPES.SHIPPING
        : BENEFIT_TYPES.DISCOUNT
);

const normalizeAppliedCoupons = (appliedCoupons = []) => (
    Array.isArray(appliedCoupons)
        ? appliedCoupons
            .filter(Boolean)
            .map((coupon) => ({
                id: coupon.id || null,
                benefitType: coupon.benefitType || BENEFIT_TYPES.DISCOUNT,
            }))
        : []
);

const normalizeCouponPayload = (data = {}) => {
    const normalized = { ...data };

    if (normalized.code) {
        normalized.code = normalized.code.toUpperCase();
    }

    if (normalized.type === SHIPPING_COUPON_TYPE) {
        normalized.value = 0;
        if (normalized.max_discount_amount === '' || normalized.max_discount_amount === undefined) {
            normalized.max_discount_amount = null;
        }
    }

    return normalized;
};

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
        Object.assign(where, activeConditions());
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
        include: [{
            model: CouponAssignment,
            as: 'assignments',
            include: [{ model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] }],
        }],
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
    const coupon = await Coupon.findByPk(id, {
        include: [{
            model: CouponAssignment,
            as: 'assignments',
            include: [{ model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] }],
        }],
    });
    if (!coupon) {
        throw new AppError('Coupon not found', 404);
    }
    return coupon;
};

/**
 * Get PUBLIC active coupons (for AI / public display)
 */
const getPublicCoupons = async (limit = 10) => {
    const coupons = await Coupon.findAll({
        where: {
            ...activeConditions(),
            visibility: 'PUBLIC',
        },
        order: [['created_at', 'DESC']],
        limit,
    });
    return coupons;
};

/**
 * Get coupons available for a specific user (PUBLIC + their PERSONAL assignments)
 */
const getCouponsForUser = async (userId, limit = 20) => {
    // PUBLIC coupons
    const publicCoupons = await Coupon.findAll({
        where: { ...activeConditions(), visibility: 'PUBLIC' },
        order: [['created_at', 'DESC']],
        limit,
    });

    // PERSONAL coupons assigned to this user
    const personalAssignments = await CouponAssignment.findAll({
        where: { user_id: userId },
        include: [{
            model: Coupon,
            as: 'coupon',
            where: activeConditions(),
        }],
    });
    const personalCoupons = personalAssignments
        .map(a => a.coupon)
        .filter(Boolean);

    // Merge and deduplicate by ID
    const seen = new Set();
    const merged = [];
    for (const c of [...publicCoupons, ...personalCoupons]) {
        if (!seen.has(c.id)) {
            seen.add(c.id);
            merged.push(c);
        }
    }
    return merged;
};

/**
 * Create coupon (admin)
 */
const createCoupon = async (data) => {
    const normalizedData = normalizeCouponPayload(data);
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
        visibility,
        assigned_user_ids,
    } = normalizedData;

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
        visibility: visibility || 'PUBLIC',
    });

    // Create assignments for PERSONAL coupons
    if (visibility === 'PERSONAL' && Array.isArray(assigned_user_ids) && assigned_user_ids.length) {
        await _syncAssignments(coupon.id, assigned_user_ids);
    }

    return getCouponById(coupon.id);
};

/**
 * Update coupon (admin)
 */
const updateCoupon = async (id, data) => {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) throw new AppError('Coupon not found', 404);

    const updateData = normalizeCouponPayload(data);
    delete updateData.assigned_user_ids;

    await coupon.update(updateData);

    // Sync assignments if visibility is PERSONAL
    if (coupon.visibility === 'PERSONAL' && Array.isArray(data.assigned_user_ids)) {
        await _syncAssignments(coupon.id, data.assigned_user_ids);
    } else if (coupon.visibility !== 'PERSONAL') {
        // Remove all assignments if no longer PERSONAL
        await CouponAssignment.destroy({ where: { coupon_id: coupon.id } });
    }

    return getCouponById(coupon.id);
};

/**
 * Sync user assignments for a PERSONAL coupon
 */
const _syncAssignments = async (couponId, userIds) => {
    const existing = await CouponAssignment.findAll({ where: { coupon_id: couponId } });
    const existingUserIds = existing.map(a => a.user_id);

    // Add new
    const toAdd = userIds.filter(uid => !existingUserIds.includes(uid));
    for (const userId of toAdd) {
        await CouponAssignment.create({ coupon_id: couponId, user_id: userId });
    }

    // Remove unassigned
    const toRemove = existingUserIds.filter(uid => !userIds.includes(uid));
    if (toRemove.length) {
        await CouponAssignment.destroy({
            where: { coupon_id: couponId, user_id: { [Op.in]: toRemove } },
        });
    }
};

/**
 * Delete coupon (admin)
 */
const deleteCoupon = async (id) => {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) throw new AppError('Coupon not found', 404);
    await CouponAssignment.destroy({ where: { coupon_id: id } });
    await coupon.destroy();
    return { message: 'Coupon deleted successfully' };
};

/**
 * Validate coupon code
 */
const validateCoupon = async (code, userId, cartTotal, _cartItems = [], options = {}) => {
    const {
        shippingFee = 0,
        expectedBenefitType = null,
        appliedCoupons = [],
    } = options;

    const coupon = await Coupon.findOne({
        where: { code: code.toUpperCase() },
    });

    if (!coupon) {
        throw new AppError('Invalid coupon code', 400);
    }

    if (!coupon.is_active) {
        throw new AppError('This coupon is no longer active', 400);
    }

    const benefitType = getCouponBenefitType(coupon);
    const normalizedAppliedCoupons = normalizeAppliedCoupons(appliedCoupons);

    if (expectedBenefitType && benefitType !== expectedBenefitType) {
        throw new AppError(
            expectedBenefitType === BENEFIT_TYPES.SHIPPING
                ? 'This code is not a free shipping coupon'
                : 'This code is not a product discount coupon',
            400
        );
    }

    const conflictingCoupon = normalizedAppliedCoupons.find((appliedCoupon) => (
        appliedCoupon.benefitType === benefitType && appliedCoupon.id !== coupon.id
    ));

    if (conflictingCoupon) {
        throw new AppError(
            benefitType === BENEFIT_TYPES.SHIPPING
                ? 'A free shipping coupon is already applied'
                : 'A product discount coupon is already applied',
            400
        );
    }

    // Visibility check
    if (coupon.visibility === 'PERSONAL') {
        if (!userId) {
            throw new AppError('Please log in to use this coupon', 400);
        }
        const assignment = await CouponAssignment.findOne({
            where: { coupon_id: coupon.id, user_id: userId },
        });
        if (!assignment) {
            throw new AppError('This coupon is not available for your account', 400);
        }
    }

    // Check start date
    if (coupon.starts_at) {
        const startDate = new Date(coupon.starts_at).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        if (startDate > today) {
            throw new AppError('This coupon is not yet valid', 400);
        }
    }

    // Check expiry
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
    let shippingDiscountAmount = 0;
    const numericShippingFee = Math.max(Number(shippingFee || 0), 0);

    if (coupon.type === SHIPPING_COUPON_TYPE) {
        if (numericShippingFee <= 0) {
            throw new AppError('Shipping is already free for this order', 400);
        }

        shippingDiscountAmount = numericShippingFee;
        if (coupon.max_discount_amount && shippingDiscountAmount > parseFloat(coupon.max_discount_amount)) {
            shippingDiscountAmount = parseFloat(coupon.max_discount_amount);
        }
    } else if (coupon.type === 'PERCENTAGE') {
        discountAmount = (cartTotal * parseFloat(coupon.value)) / 100;
        if (coupon.max_discount_amount && discountAmount > parseFloat(coupon.max_discount_amount)) {
            discountAmount = parseFloat(coupon.max_discount_amount);
        }
    } else {
        discountAmount = parseFloat(coupon.value);
    }

    if (discountAmount > cartTotal) {
        discountAmount = cartTotal;
    }

    if (shippingDiscountAmount > numericShippingFee) {
        shippingDiscountAmount = numericShippingFee;
    }

    const roundedDiscountAmount = roundCurrency(discountAmount);
    const roundedShippingDiscountAmount = roundCurrency(shippingDiscountAmount);
    const newShippingFee = roundCurrency(numericShippingFee - roundedShippingDiscountAmount);
    const newTotal = roundCurrency(cartTotal + numericShippingFee - roundedDiscountAmount - roundedShippingDiscountAmount);

    return {
        coupon: {
            id: coupon.id,
            code: coupon.code,
            name: coupon.name,
            type: coupon.type,
            value: coupon.value,
            benefitType,
        },
        discountAmount: roundedDiscountAmount,
        shippingDiscountAmount: roundedShippingDiscountAmount,
        newShippingFee,
        newTotal,
    };
};

/**
 * Apply coupon to order (internal use during checkout)
 */
const applyCoupon = async (couponId, userId, orderId, discountAmount) => {
    const coupon = await Coupon.findByPk(couponId);
    if (!coupon) throw new AppError('Coupon not found', 404);

    await CouponUsage.create({
        coupon_id: couponId,
        user_id: userId,
        order_id: orderId,
        discount_amount: discountAmount,
    });

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
    getPublicCoupons,
    getCouponsForUser,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    applyCoupon,
    getCouponStats,
};
