/**
 * User Service
 * AURA ARCHIVE - User profile and account logic
 */

const { User, Order, Wishlist, Product } = require('../models');
const AppError = require('../utils/AppError');
const bcrypt = require('bcryptjs');

/**
 * Get user profile
 */
const getProfile = async (userId) => {
    const user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] },
    });

    if (!user) {
        throw new AppError('User not found', 404);
    }

    return user;
};

/**
 * Update user profile
 */
const updateProfile = async (userId, data) => {
    const user = await User.findByPk(userId);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    const allowedFields = ['first_name', 'last_name', 'phone', 'address', 'city', 'district', 'ward'];
    const updateData = {};

    allowedFields.forEach(field => {
        if (data[field] !== undefined) {
            updateData[field] = data[field];
        }
    });

    await user.update(updateData);

    return user;
};

/**
 * Change password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await User.findByPk(userId);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
        throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(newPassword, salt);

    await user.update({ password_hash: hash });

    return { message: 'Password changed successfully' };
};

/**
 * Get user's order history
 */
const getOrderHistory = async (userId, options = {}) => {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await Order.findAndCountAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit,
        offset,
    });

    return {
        orders: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};

/**
 * Get single order detail for user
 */
const getOrderDetail = async (userId, orderId) => {
    const order = await Order.findOne({
        where: { id: orderId, user_id: userId },
    });

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    return order;
};

// ============ ADMIN USER MANAGEMENT ============

/**
 * Get all users (admin)
 */
const getAllUsers = async (options = {}) => {
    const { page = 1, limit = 20, role, search } = options;
    const offset = (page - 1) * limit;
    const { Op } = require('sequelize');

    const where = {};

    if (role) {
        where.role = role;
    }

    if (search) {
        where[Op.or] = [
            { email: { [Op.iLike]: `%${search}%` } },
            { first_name: { [Op.iLike]: `%${search}%` } },
            { last_name: { [Op.iLike]: `%${search}%` } },
        ];
    }

    const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] },
        order: [['created_at', 'DESC']],
        limit,
        offset,
    });

    return {
        users: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};

/**
 * Get user detail (admin)
 */
const getUserDetail = async (userId) => {
    const user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] },
    });

    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Get user stats
    const orderCount = await Order.count({ where: { user_id: userId } });
    const wishlistCount = await Wishlist.count({ where: { user_id: userId } });

    // Get recent orders
    const recentOrders = await Order.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: 5,
    });

    // Get wishlist
    const wishlist = await Wishlist.findAll({
        where: { user_id: userId },
        include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'brand', 'base_price'],
        }],
        limit: 10,
    });

    return {
        user,
        stats: {
            orderCount,
            wishlistCount,
        },
        recentOrders,
        wishlist,
    };
};

/**
 * Update user status (admin)
 */
const updateUserStatus = async (userId, isActive) => {
    const user = await User.findByPk(userId);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    await user.update({ is_active: isActive });

    return user;
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    getOrderHistory,
    getOrderDetail,
    getAllUsers,
    getUserDetail,
    updateUserStatus,
};
