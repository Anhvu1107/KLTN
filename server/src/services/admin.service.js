/**
 * Admin Service
 * AURA ARCHIVE - Business logic for admin dashboard
 */

const { Order, User, Product, Variant, SystemPrompt, sequelize, OrderItem } = require('../models');
const AppError = require('../utils/AppError');
const { Op, fn, col } = require('sequelize');
const notificationService = require('./notification.service');
const { sendShippingUpdate } = require('./email.service');
const {
    sendOrderConfirmedEmail,
    sendOrderDeliveredEmail,
    sendOrderCancelledEmail,
} = require('../utils/sendEmail');

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
 * Get revenue for charts with specific period selection.
 * view=year    → 12 months of that year
 * view=quarter → 3 months of that quarter
 * view=month   → days of that month
 */
const getRevenue = async (view = 'year', year, month, quarter) => {
    const now = new Date();
    if (!year) year = now.getFullYear();

    let startDate, endDate, trunc, slots;

    switch (view) {
        case 'month': {
            if (!month) month = now.getMonth() + 1;
            trunc = 'day';
            startDate = new Date(Date.UTC(year, month - 1, 1));
            const daysInMonth = new Date(year, month, 0).getDate();
            endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59));
            slots = Array.from({ length: daysInMonth }, (_, i) => ({
                label: `${String(i + 1).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
                key: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
            }));
            break;
        }
        case 'quarter': {
            if (!quarter) quarter = Math.ceil((now.getMonth() + 1) / 3);
            trunc = 'month';
            const startMonth = (quarter - 1) * 3;
            startDate = new Date(Date.UTC(year, startMonth, 1));
            endDate = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59));
            slots = Array.from({ length: 3 }, (_, i) => {
                const m = startMonth + i + 1;
                return {
                    label: `${String(m).padStart(2, '0')}/${year}`,
                    key: `${year}-${String(m).padStart(2, '0')}`,
                };
            });
            break;
        }
        case 'year':
        default: {
            trunc = 'month';
            startDate = new Date(Date.UTC(year, 0, 1));
            endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
            slots = Array.from({ length: 12 }, (_, i) => ({
                label: `${String(i + 1).padStart(2, '0')}/${year}`,
                key: `${year}-${String(i + 1).padStart(2, '0')}`,
            }));
            break;
        }
    }

    const result = await Order.findAll({
        attributes: [
            [fn('DATE_TRUNC', trunc, col('created_at')), 'period'],
            [fn('SUM', col('total_amount')), 'revenue'],
            [fn('COUNT', col('id')), 'orders'],
        ],
        where: {
            status: 'DELIVERED',
            payment_status: 'PAID',
            created_at: { [Op.gte]: startDate, [Op.lte]: endDate },
        },
        group: [fn('DATE_TRUNC', trunc, col('created_at'))],
        order: [[fn('DATE_TRUNC', trunc, col('created_at')), 'ASC']],
        raw: true,
    });

    // Build data map from DB results using UTC dates
    const dataMap = {};
    result.forEach((row) => {
        const d = new Date(row.period);
        let key;
        if (trunc === 'day') {
            key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        } else {
            key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        }
        dataMap[key] = {
            revenue: parseFloat(row.revenue) || 0,
            orders: parseInt(row.orders) || 0,
        };
    });

    // Fill all slots
    const labels = [];
    const revenues = [];
    const orderCounts = [];
    slots.forEach((slot) => {
        labels.push(slot.label);
        revenues.push(dataMap[slot.key]?.revenue || 0);
        orderCounts.push(dataMap[slot.key]?.orders || 0);
    });

    return { labels, revenues, orderCounts, view, year, month, quarter };
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
    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findByPk(orderId, {
            lock: transaction.LOCK.UPDATE,
            transaction,
        });

        if (!order) {
            await transaction.rollback();
            throw new AppError('Order not found', 404);
        }

        // Load items separately to avoid outer join lock error
        order.items = await OrderItem.findAll({
            where: { order_id: orderId },
            transaction,
        });

        const validTransitions = {
            PENDING: ['CONFIRMED', 'CANCELLED'],
            CONFIRMED: ['PENDING', 'PROCESSING', 'CANCELLED'],
            PROCESSING: ['CONFIRMED', 'SHIPPED', 'CANCELLED'],
            SHIPPED: ['PROCESSING', 'DELIVERED'],
            DELIVERED: ['SHIPPED'],
            CANCELLED: ['PENDING'],
        };

        if (!validTransitions[order.status]?.includes(status)) {
            await transaction.rollback();
            throw new AppError(`Cannot transition from ${order.status} to ${status}`, 400);
        }

        const updateData = { status };

        if (status === 'CONFIRMED') updateData.confirmed_at = new Date();
        if (status === 'SHIPPED') updateData.shipped_at = new Date();
        if (status === 'DELIVERED') {
            updateData.delivered_at = new Date();
            updateData.payment_status = 'PAID';
        }

        // Manage inventory on cancellation (inside transaction for atomicity)
        if (status === 'CANCELLED') {
            updateData.cancelled_at = new Date();
            if (order.items && order.items.length > 0) {
                const variantIds = order.items.map(item => item.variant_id);
                await Variant.update(
                    { status: 'AVAILABLE', sold_at: null },
                    { where: { id: { [Op.in]: variantIds } }, transaction }
                );
            }
        } else if (order.status === 'CANCELLED' && status !== 'CANCELLED') {
            // If un-cancelling, reserve items again
            if (order.items && order.items.length > 0) {
                const variantIds = order.items.map(item => item.variant_id);
                await Variant.update(
                    { status: 'SOLD', sold_at: new Date() },
                    { where: { id: { [Op.in]: variantIds } }, transaction }
                );
            }
        }

        await order.update(updateData, { transaction });
        await transaction.commit();

        // Send notifications and emails (fire-and-forget, outside transaction)
        try {
            const user = await User.findByPk(order.user_id);
            if (user) {
                // In-app notification
                await notificationService.notifyOrderStatusChange(order, user, status);

                // Send appropriate email based on status
                switch (status) {
                    case 'CONFIRMED':
                        sendOrderConfirmedEmail(order, user).catch(err =>
                            console.error('Failed to send confirmed email:', err.message)
                        );
                        break;
                    case 'SHIPPED':
                        sendShippingUpdate(order, user).catch(err =>
                            console.error('Failed to send shipping email:', err.message)
                        );
                        break;
                    case 'DELIVERED':
                        sendOrderDeliveredEmail(order, user).catch(err =>
                            console.error('Failed to send delivered email:', err.message)
                        );
                        break;
                    case 'CANCELLED':
                        sendOrderCancelledEmail(order, user).catch(err =>
                            console.error('Failed to send cancelled email:', err.message)
                        );
                        break;
                }
            }
        } catch (notifError) {
            console.error('Failed to send status change notifications:', notifError.message);
        }

        return order;
    } catch (error) {
        // Only rollback if transaction hasn't been committed
        if (!transaction.finished) {
            await transaction.rollback();
        }
        throw error;
    }
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
        return SystemPrompt.create({
            key,
            name: name || key,
            content,
            description,
            is_active: true,
            version: 1,
        });
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
    getRevenue,
    getRecentOrders,
    updateOrderStatus,
    getSystemPrompts,
    getSystemPromptByKey,
    updateSystemPrompt,
    getAllOrders,
};
