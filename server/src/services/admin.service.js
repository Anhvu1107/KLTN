/**
 * Admin Service
 * AURA ARCHIVE - Business logic for admin dashboard
 */

const { Order, User, Product, Variant, SystemPrompt, sequelize } = require('../models');
const AppError = require('../utils/AppError');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Get dashboard statistics
 */
const getStats = async () => {
    // Total revenue (delivered orders)
    const revenueResult = await Order.findOne({
        attributes: [[fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total']],
        where: { status: 'DELIVERED', payment_status: 'PAID' },
        raw: true,
    });
    const totalRevenue = parseFloat(revenueResult?.total || 0);

    // Total orders count
    const totalOrders = await Order.count();

    // Pending orders
    const pendingOrders = await Order.count({ where: { status: 'PENDING' } });

    // Total products
    const totalProducts = await Product.count({ where: { is_active: true } });

    // Available variants
    const availableItems = await Variant.count({ where: { status: 'AVAILABLE' } });

    // Sold variants
    const soldItems = await Variant.count({ where: { status: 'SOLD' } });

    // Total customers
    const totalCustomers = await User.count({ where: { role: 'CUSTOMER' } });

    // New customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newCustomersThisMonth = await User.count({
        where: {
            role: 'CUSTOMER',
            created_at: { [Op.gte]: startOfMonth },
        },
    });

    return {
        totalRevenue,
        totalOrders,
        pendingOrders,
        totalProducts,
        availableItems,
        soldItems,
        totalCustomers,
        newCustomersThisMonth,
    };
};

/**
 * Get monthly revenue for charts (last 12 months)
 */
const getMonthlyRevenue = async () => {
    const result = await Order.findAll({
        attributes: [
            [fn('DATE_TRUNC', 'month', col('created_at')), 'month'],
            [fn('SUM', col('total_amount')), 'revenue'],
            [fn('COUNT', col('id')), 'orders'],
        ],
        where: {
            status: 'DELIVERED',
            payment_status: 'PAID',
            created_at: {
                [Op.gte]: literal("NOW() - INTERVAL '12 months'"),
            },
        },
        group: [fn('DATE_TRUNC', 'month', col('created_at'))],
        order: [[fn('DATE_TRUNC', 'month', col('created_at')), 'ASC']],
        raw: true,
    });

    // Format for chart
    const months = [];
    const revenues = [];
    const orderCounts = [];

    result.forEach((row) => {
        const date = new Date(row.month);
        months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        revenues.push(parseFloat(row.revenue) || 0);
        orderCounts.push(parseInt(row.orders) || 0);
    });

    return { months, revenues, orderCounts };
};

/**
 * Get recent orders
 */
const getRecentOrders = async (limit = 10) => {
    const orders = await Order.findAll({
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name'],
        }],
        order: [['created_at', 'DESC']],
        limit,
    });

    return orders;
};

/**
 * Update order status
 */
const updateOrderStatus = async (orderId, status) => {
    const order = await Order.findByPk(orderId);

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    const validTransitions = {
        PENDING: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['PENDING', 'PROCESSING', 'CANCELLED'],
        PROCESSING: ['CONFIRMED', 'SHIPPED', 'CANCELLED'],
        SHIPPED: ['PROCESSING', 'DELIVERED'],
        DELIVERED: ['SHIPPED'],
        CANCELLED: ['PENDING'],
    };

    if (!validTransitions[order.status]?.includes(status)) {
        throw new AppError(`Cannot transition from ${order.status} to ${status}`, 400);
    }

    const updateData = { status };

    // Set timestamps based on status
    if (status === 'CONFIRMED') updateData.confirmed_at = new Date();
    if (status === 'SHIPPED') updateData.shipped_at = new Date();
    if (status === 'DELIVERED') {
        updateData.delivered_at = new Date();
        updateData.payment_status = 'PAID';
    }
    if (status === 'CANCELLED') updateData.cancelled_at = new Date();

    await order.update(updateData);

    return order;
};

/**
 * Get all system prompts
 */
const getSystemPrompts = async () => {
    const prompts = await SystemPrompt.findAll({
        order: [['key', 'ASC']],
    });

    return prompts;
};

/**
 * Get system prompt by key
 */
const getSystemPromptByKey = async (key) => {
    const prompt = await SystemPrompt.findOne({ where: { key } });

    if (!prompt) {
        throw new AppError('System prompt not found', 404);
    }

    return prompt;
};

/**
 * Update system prompt
 */
const updateSystemPrompt = async (key, content, name = null, description = null) => {
    const prompt = await SystemPrompt.findOne({ where: { key } });

    if (!prompt) {
        throw new AppError('System prompt not found', 404);
    }

    const updateData = {
        content,
        version: prompt.version + 1,
    };

    if (name) updateData.name = name;
    if (description) updateData.description = description;

    await prompt.update(updateData);

    return prompt;
};

/**
 * Get all orders with filters (admin)
 */
const getAllOrders = async (options = {}) => {
    const { page = 1, limit = 20, status, search } = options;
    const offset = (page - 1) * limit;

    const where = {};

    if (status) {
        where.status = status;
    }

    const { count, rows } = await Order.findAndCountAll({
        where,
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name'],
            where: search ? {
                [Op.or]: [
                    { email: { [Op.iLike]: `%${search}%` } },
                    { first_name: { [Op.iLike]: `%${search}%` } },
                    { last_name: { [Op.iLike]: `%${search}%` } },
                ],
            } : undefined,
        }],
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

module.exports = {
    getStats,
    getMonthlyRevenue,
    getRecentOrders,
    updateOrderStatus,
    getSystemPrompts,
    getSystemPromptByKey,
    updateSystemPrompt,
    getAllOrders,
};
