/**
 * Order Controller
 * AURA ARCHIVE - Handle HTTP requests for orders
 */

const orderService = require('../services/order.service');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/v1/orders
 * Create a new order (Checkout)
 */
const createOrder = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const {
        items,
        paymentMethod,
        shippingAddress,
        billingAddress,
        notes,
        shippingFee,
        couponId,
        discountCouponId,
        shippingCouponId,
    } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Cart is empty. Please add items before checkout.',
        });
    }

    if (!paymentMethod) {
        return res.status(400).json({
            success: false,
            message: 'Payment method is required.',
        });
    }

    if (!shippingAddress) {
        return res.status(400).json({
            success: false,
            message: 'Shipping address is required.',
        });
    }

    const order = await orderService.createOrder(userId, items, {
        paymentMethod,
        shippingAddress,
        billingAddress,
        notes,
        shippingFee: shippingFee || 0,
        couponId: couponId || null,
        discountCouponId: discountCouponId || null,
        shippingCouponId: shippingCouponId || null,
    });

    // Send notifications (fire-and-forget, don't block response)
    orderService.sendOrderNotifications(order, userId).catch(err =>
        console.error('Notification error:', err.message)
    );

    res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: { order },
    });
});

/**
 * GET /api/v1/orders
 * Get current user's orders
 */
const getMyOrders = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const result = await orderService.getUserOrders(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
    });

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/orders/:id
 * Get order by ID
 */
const getOrderById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.role === 'ADMIN' ? null : req.user.id;

    const order = await orderService.getOrderById(id, userId);

    res.status(200).json({
        success: true,
        data: { order },
    });
});

/**
 * POST /api/v1/orders/:id/cancel
 * Cancel an order
 */
const cancelOrder = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await orderService.cancelOrder(id, userId);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

/**
 * POST /api/v1/orders/check-availability
 * Check if items are still available
 */
const checkAvailability = catchAsync(async (req, res) => {
    const { variantIds } = req.body;

    if (!variantIds || !Array.isArray(variantIds)) {
        return res.status(400).json({
            success: false,
            message: 'variantIds array is required',
        });
    }

    const results = await orderService.checkAvailability(variantIds);

    const allAvailable = results.every(r => r.isAvailable);

    res.status(200).json({
        success: true,
        data: {
            allAvailable,
            items: results,
        },
    });
});

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrder,
    checkAvailability,
};
