/**
 * Order Service
 * AURA ARCHIVE - Business logic for orders with transaction support
 */

const { Order, OrderItem, Variant, Product, User, sequelize } = require('../models');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');

/**
 * Create a new order with transaction support
 * Implements the "Unique Item" logic for resell platform
 * 
 * @param {string} userId - User ID
 * @param {Array} items - Array of { variantId, quantity }
 * @param {Object} orderData - { paymentMethod, shippingAddress, notes }
 * @returns {Object} - Created order with items
 */
const createOrder = async (userId, items, orderData) => {
    const transaction = await sequelize.transaction();

    try {
        // Step 1: Validate and lock variants
        const variantIds = items.map(item => item.variantId);

        // Fetch variants with product info and lock for update
        const variants = await Variant.findAll({
            where: { id: { [Op.in]: variantIds } },
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'brand', 'base_price', 'sale_price'],
            }],
            lock: transaction.LOCK.UPDATE,
            transaction,
        });

        // Check if all variants exist
        if (variants.length !== variantIds.length) {
            throw new AppError('One or more items not found', 404);
        }

        // Check if all variants are available
        const unavailableItems = variants.filter(v => v.status !== 'AVAILABLE');
        if (unavailableItems.length > 0) {
            const itemNames = unavailableItems.map(v => v.product?.name || v.sku).join(', ');
            throw new AppError(`These items are no longer available: ${itemNames}`, 400);
        }

        // Step 2: Calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const variant of variants) {
            const product = variant.product;
            const price = parseFloat(product.sale_price || product.base_price) + parseFloat(variant.price_adjustment || 0);

            subtotal += price;

            orderItems.push({
                variant_id: variant.id,
                product_name: product.name,
                product_brand: product.brand,
                variant_size: variant.size,
                variant_color: variant.color,
                price: price,
                quantity: 1, // Always 1 for resell items
                total: price,
            });
        }

        const shippingFee = orderData.shippingFee || 0;
        const discountAmount = orderData.discountAmount || 0;
        const totalAmount = subtotal + shippingFee - discountAmount;

        // Step 3: Create order
        const order = await Order.create({
            user_id: userId,
            status: 'PENDING',
            subtotal,
            shipping_fee: shippingFee,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            payment_method: orderData.paymentMethod,
            payment_status: 'PENDING',
            shipping_address: orderData.shippingAddress,
            billing_address: orderData.billingAddress || null,
            notes: orderData.notes || null,
        }, { transaction });

        // Step 4: Create order items
        for (const item of orderItems) {
            await OrderItem.create({
                order_id: order.id,
                ...item,
            }, { transaction });
        }

        // Step 5: Update variant statuses to SOLD
        await Variant.update(
            {
                status: 'SOLD',
                sold_at: new Date(),
            },
            {
                where: { id: { [Op.in]: variantIds } },
                transaction,
            }
        );

        // Step 6: Commit transaction
        await transaction.commit();

        // Fetch complete order with items
        const completeOrder = await Order.findByPk(order.id, {
            include: [{
                model: OrderItem,
                as: 'items',
                include: [{
                    model: Variant,
                    as: 'variant',
                    include: [{
                        model: Product,
                        as: 'product',
                    }],
                }],
            }],
        });

        return completeOrder;

    } catch (error) {
        // Rollback transaction on error
        await transaction.rollback();
        throw error;
    }
};

/**
 * Get orders for a user
 */
const getUserOrders = async (userId, options = {}) => {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;

    const where = { user_id: userId };
    if (status) {
        where.status = status;
    }

    const { count, rows } = await Order.findAndCountAll({
        where,
        include: [{
            model: OrderItem,
            as: 'items',
            include: [{
                model: Variant,
                as: 'variant',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'brand', 'images'],
                }],
            }],
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

/**
 * Get order by ID
 */
const getOrderById = async (orderId, userId = null) => {
    const where = { id: orderId };
    if (userId) {
        where.user_id = userId;
    }

    const order = await Order.findOne({
        where,
        include: [
            {
                model: OrderItem,
                as: 'items',
                include: [{
                    model: Variant,
                    as: 'variant',
                    include: [{
                        model: Product,
                        as: 'product',
                    }],
                }],
            },
            {
                model: User,
                as: 'user',
                attributes: ['id', 'email', 'first_name', 'last_name', 'phone'],
            },
        ],
    });

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    return order;
};

/**
 * Cancel order (only if PENDING)
 */
const cancelOrder = async (orderId, userId) => {
    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findOne({
            where: { id: orderId, user_id: userId },
            include: [{ model: OrderItem, as: 'items' }],
            lock: transaction.LOCK.UPDATE,
            transaction,
        });

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        if (order.status !== 'PENDING') {
            throw new AppError('Only pending orders can be cancelled', 400);
        }

        // Update order status
        await order.update({
            status: 'CANCELLED',
            cancelled_at: new Date(),
        }, { transaction });

        // Restore variant statuses to AVAILABLE
        const variantIds = order.items.map(item => item.variant_id);
        await Variant.update(
            {
                status: 'AVAILABLE',
                sold_at: null,
            },
            {
                where: { id: { [Op.in]: variantIds } },
                transaction,
            }
        );

        await transaction.commit();

        return { message: 'Order cancelled successfully' };

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Check item availability
 */
const checkAvailability = async (variantIds) => {
    const variants = await Variant.findAll({
        where: { id: { [Op.in]: variantIds } },
        include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'brand'],
        }],
    });

    const results = variants.map(variant => ({
        variantId: variant.id,
        productName: variant.product?.name,
        status: variant.status,
        isAvailable: variant.status === 'AVAILABLE',
    }));

    return results;
};

module.exports = {
    createOrder,
    getUserOrders,
    getOrderById,
    cancelOrder,
    checkAvailability,
};
