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
const CHANGEABLE_PAYMENT_METHODS = ['COD', 'BANK_TRANSFER', 'MOMO', 'VNPAY', 'PAYPAL'];
const DEFERRED_PAYMENT_METHODS = ['MOMO', 'VNPAY', 'PAYPAL'];

const toPositiveInteger = (value, fallback = 1) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const normalizeOrderItems = (items = []) => {
    const itemMap = new Map();

    for (const item of items) {
        const variantId = item?.variantId || item?.id;
        if (!variantId) continue;

        const quantity = toPositiveInteger(item.quantity, 1);
        const existing = itemMap.get(variantId);

        if (existing) {
            existing.quantity += quantity;
            if (!existing.productName && item.productName) {
                existing.productName = item.productName;
            }
            continue;
        }

        itemMap.set(variantId, {
            variantId,
            quantity,
            productName: item.productName || item.name || 'Unknown Item',
        });
    }

    return Array.from(itemMap.values());
};

const toNonNegativeAmount = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
};

const markZeroTotalOrdersPaid = async (orders = []) => {
    const zeroTotalPendingOrders = orders.filter(order =>
        order?.payment_status === 'PENDING' && toNonNegativeAmount(order.total_amount) === 0
    );

    if (zeroTotalPendingOrders.length === 0) return;

    const orderIds = zeroTotalPendingOrders.map(order => order.id);
    await Order.update(
        {
            payment_status: 'PAID',
            payment_transaction_id: 'FREE_ORDER',
        },
        {
            where: {
                id: { [Op.in]: orderIds },
                payment_status: 'PENDING',
            },
        }
    );

    for (const order of zeroTotalPendingOrders) {
        order.setDataValue('payment_status', 'PAID');
        order.setDataValue('payment_transaction_id', order.payment_transaction_id || 'FREE_ORDER');
    }
};

const shouldMarkAbandonedCartConvertedAtCheckout = (order) => {
    const paymentMethod = String(order?.payment_method || '').toUpperCase();
    if (order?.payment_status === 'PAID') return true;
    return !DEFERRED_PAYMENT_METHODS.includes(paymentMethod);
};

/**
 * Create a new order with transaction support
 * Implements the "Unique Item" logic for resell platform
 */
const createOrder = async (userId, items, orderData) => {
    const transaction = await sequelize.transaction();

    try {
        // Step 1: Validate and lock variants
        const normalizedItems = normalizeOrderItems(items);
        if (normalizedItems.length === 0) {
            throw new AppError('Cart is empty. Please add items before checkout.', 400);
        }

        const variantMap = new Map(normalizedItems.map(item => [item.variantId, item.quantity]));
        const requestedItemMap = new Map(normalizedItems.map(item => [item.variantId, item]));
        const variantIds = Array.from(variantMap.keys());

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
            const foundVariantIds = new Set(variants.map(v => v.id));
            const missingNames = normalizedItems
                .filter(item => !foundVariantIds.has(item.variantId))
                .map(item => item.productName || item.variantId)
                .join(', ');
            throw new AppError(`These items are no longer available: ${missingNames}`, 400);
        }

        // Check if all variants are available
        const unavailableItems = variants.filter(v => {
            const requestedQty = variantMap.get(v.id);
            return v.status !== 'AVAILABLE' || v.stock_quantity < requestedQty;
        });
        if (unavailableItems.length > 0) {
            const itemNames = unavailableItems
                .map(v => v.product?.name || requestedItemMap.get(v.id)?.productName || v.sku)
                .join(', ');
            throw new AppError(`These items are no longer available or do not have enough stock: ${itemNames}`, 400);
        }

        // Step 2: Calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const variant of variants) {
            const product = variant.product;
            const price = parseFloat(product.sale_price || product.base_price) + parseFloat(variant.price_adjustment || 0);
            const requestedQty = variantMap.get(variant.id);
            
            const lineTotal = price * requestedQty;
            subtotal += lineTotal;

            orderItems.push({
                variant_id: variant.id,
                product_name: product.name,
                product_brand: product.brand,
                variant_size: variant.size,
                variant_color: variant.color,
                price: price,
                quantity: requestedQty,
                total: lineTotal,
            });
        }

        const shippingFee = toNonNegativeAmount(orderData.shippingFee);

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

        const totalAmount = toNonNegativeAmount(subtotal + shippingFee - discountAmount - shippingDiscountAmount);
        const isFreeOrder = totalAmount === 0;

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
            payment_status: isFreeOrder ? 'PAID' : 'PENDING',
            payment_transaction_id: isFreeOrder ? 'FREE_ORDER' : null,
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

        // Step 5: Update variant stock and status
        for (const variant of variants) {
            const requestedQty = variantMap.get(variant.id);
            const newStock = Math.max(0, variant.stock_quantity - requestedQty);
            const updates = { stock_quantity: newStock };
            if (newStock === 0) {
                updates.status = 'SOLD';
                updates.sold_at = new Date();
            }
            await variant.update(updates, { transaction });
        }

        // Step 6: Commit transaction
        await transaction.commit();

        if (shouldMarkAbandonedCartConvertedAtCheckout(order)) {
            // This is analytics/recovery bookkeeping, so it should not slow down checkout.
            abandonedCartService.markLatestCartAsConverted(userId).catch((error) => {
                console.error('Failed to mark abandoned cart as converted:', error.message);
            });
        }

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

    await markZeroTotalOrdersPaid(rows);

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

    await markZeroTotalOrdersPaid([order]);

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

        // Restore variant stock and statuses to AVAILABLE
        for (const item of order.items) {
            const variant = await Variant.findByPk(item.variant_id, { transaction });
            if (variant) {
                const newStock = variant.stock_quantity + item.quantity;
                await variant.update({
                    stock_quantity: newStock,
                    status: 'AVAILABLE',
                    reserved_at: null,
                    reserved_by: null,
                    sold_at: null,
                }, { transaction });
            }
        }

        await transaction.commit();

        abandonedCartService.reactivateLatestConvertedCart(userId).catch((error) => {
            console.error('Failed to reactivate abandoned cart after cancellation:', error.message);
        });

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
const checkAvailability = async (items) => {
    const normalizedItems = normalizeOrderItems(items);
    if (normalizedItems.length === 0) {
        return [];
    }

    const variantIds = normalizedItems.map(item => item.variantId);
    const variants = await Variant.findAll({
        where: { id: { [Op.in]: variantIds } },
        include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'brand'],
        }],
    });

    const variantsById = new Map(variants.map(variant => [variant.id, variant]));

    return normalizedItems.map(item => {
        const variant = variantsById.get(item.variantId);

        if (!variant) {
            return {
                variantId: item.variantId,
                productName: item.productName || 'Unknown Item',
                status: 'NOT_FOUND',
                requestedQuantity: item.quantity,
                stock_quantity: 0,
                availableQuantity: 0,
                isAvailable: false,
            };
        }

        return {
            variantId: variant.id,
            productName: variant.product?.name || item.productName,
            status: variant.status,
            requestedQuantity: item.quantity,
            stock_quantity: variant.stock_quantity,
            availableQuantity: variant.stock_quantity,
            isAvailable: variant.status === 'AVAILABLE' && variant.stock_quantity >= item.quantity,
        };
    });
};

/**
 * Change payment method while the order is still open and unpaid.
 */
const updatePaymentMethod = async (orderId, userId, paymentMethod) => {
    if (!CHANGEABLE_PAYMENT_METHODS.includes(paymentMethod)) {
        throw new AppError('Invalid payment method', 400);
    }

    const order = await Order.findOne({
        where: { id: orderId, user_id: userId },
    });

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    if (order.status !== 'PENDING') {
        throw new AppError('Only pending orders can change payment method', 400);
    }

    if (['PAID', 'REFUNDED'].includes(order.payment_status)) {
        throw new AppError('Paid or refunded orders cannot change payment method', 400);
    }

    await order.update({
        payment_method: paymentMethod,
        payment_status: 'PENDING',
        payment_transaction_id: null,
    });

    return getOrderById(orderId, userId);
};

module.exports = {
    createOrder,
    sendOrderNotifications,
    getUserOrders,
    getOrderById,
    cancelOrder,
    updatePaymentMethod,
    checkAvailability,
};
