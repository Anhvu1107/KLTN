/**
 * Order Service
 * AURA ARCHIVE - Business logic for orders with transaction support
 */

const { Order, OrderItem, Variant, Product, User, Coupon, sequelize } = require('../models');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');
const notificationService = require('./notification.service');
const { sendOrderConfirmation } = require('./email.service');
const { sendNewOrderAdminEmail } = require('../utils/sendEmail');
const couponService = require('./coupon.service');
const abandonedCartService = require('./abandoned-cart.service');

const SHIPPING_BENEFIT_TYPE = 'SHIPPING';

/**
 * Create a new order with transaction support
 * Implements the "Unique Item" logic for resell platform
 */
const createOrder = async (userId, items, orderData) => {
    const transaction = await sequelize.transaction();

    try {
        // Step 1: Validate and lock variants
        const variantIds = items.map(item => item.variantId);

        // Lock variants first (without joins to avoid FOR UPDATE error)
        await Variant.findAll({
            where: { id: { [Op.in]: variantIds } },
            lock: transaction.LOCK.UPDATE,
            transaction,
        });

        // Now fetch variants with product info (no lock needed)
        const variants = await Variant.findAll({
            where: { id: { [Op.in]: variantIds } },
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'brand', 'base_price', 'sale_price'],
            }],
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
                quantity: 1,
                total: price,
            });
        }

        const shippingFee = Number(orderData.shippingFee || 0);

        // Step 3: Validate coupons and calculate discounts (server-side)
        let discountAmount = 0;
        let shippingDiscountAmount = 0;
        const validatedCoupons = [];
        const requestedCouponIds = [...new Set([
            orderData.discountCouponId,
            orderData.shippingCouponId,
            orderData.couponId,
        ].filter(Boolean))];

        for (const couponId of requestedCouponIds) {
            const coupon = await Coupon.findByPk(couponId, { transaction });

            if (!coupon) {
                throw new AppError('Coupon not found', 404);
            }

            const validation = await couponService.validateCoupon(coupon.code, userId, subtotal, [], {
                shippingFee,
                appliedCoupons: validatedCoupons,
            });

            if (validation.coupon.benefitType === SHIPPING_BENEFIT_TYPE) {
                shippingDiscountAmount = validation.shippingDiscountAmount;
            } else {
                discountAmount = validation.discountAmount;
            }

            validatedCoupons.push({
                id: validation.coupon.id,
                benefitType: validation.coupon.benefitType,
                appliedAmount: validation.coupon.benefitType === SHIPPING_BENEFIT_TYPE
                    ? validation.shippingDiscountAmount
                    : validation.discountAmount,
            });
        }

        const totalAmount = subtotal + shippingFee - discountAmount - shippingDiscountAmount;

        // Step 3: Generate order number
        const date = new Date();
        const prefix = `AA${date.getFullYear().toString().slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const random = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `${prefix}${random}`;

        // Step 4: Create order
        const order = await Order.create({
            user_id: userId,
            order_number: orderNumber,
            status: 'PENDING',
            subtotal,
            shipping_fee: shippingFee,
            discount_amount: discountAmount,
            shipping_discount_amount: shippingDiscountAmount,
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

        // Mark the latest tracked cart as converted after a successful checkout.
        await abandonedCartService.markLatestCartAsConverted(userId).catch((error) => {
            console.error('Failed to mark abandoned cart as converted:', error.message);
        });

        // Step 7: Record coupon usage (after commit, fire-and-forget)
        for (const coupon of validatedCoupons) {
            if (coupon.appliedAmount <= 0) continue;

            couponService.applyCoupon(coupon.id, userId, order.id, coupon.appliedAmount).catch(err =>
                console.error('Failed to record coupon usage:', err.message)
            );
        }

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
        await transaction.rollback();
        throw error;
    }
};

/**
 * Send notifications after order creation (fire-and-forget)
 */
const sendOrderNotifications = async (order, userId) => {
    try {
        const user = await User.findByPk(userId);
        if (!user) return;

        // In-app notifications
        await notificationService.notifyNewOrder(order, user);

        // Email to user
        sendOrderConfirmation(order, user).catch(err =>
            console.error('Failed to send order confirmation email:', err.message)
        );

        // Email to admin
        sendNewOrderAdminEmail(order, user).catch(err =>
            console.error('Failed to send admin notification email:', err.message)
        );
    } catch (error) {
        console.error('Failed to send order notifications:', error.message);
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
        // Lock the order row first (without joins)
        await Order.findOne({
            where: { id: orderId, user_id: userId },
            lock: transaction.LOCK.UPDATE,
            transaction,
        });

        // Fetch order with items (no lock)
        const order = await Order.findOne({
            where: { id: orderId, user_id: userId },
            include: [{ model: OrderItem, as: 'items' }],
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

        // Send cancellation notifications (fire-and-forget)
        try {
            const user = await User.findByPk(userId);
            if (user) {
                await notificationService.notifyOrderStatusChange(order, user, 'CANCELLED');
                const { sendOrderCancelledEmail } = require('../utils/sendEmail');
                sendOrderCancelledEmail(order, user).catch(err =>
                    console.error('Failed to send cancellation email:', err.message)
                );
            }
        } catch (notifError) {
            console.error('Failed to send cancel notifications:', notifError.message);
        }

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
    sendOrderNotifications,
    getUserOrders,
    getOrderById,
    cancelOrder,
    checkAvailability,
};
