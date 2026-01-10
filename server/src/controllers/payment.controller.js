/**
 * Payment Controller
 * AURA ARCHIVE - Handle payment gateway operations
 */

const vnpayService = require('../services/vnpay.service');
const { Order } = require('../models');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/v1/payments/vnpay/create
 * Create VNPay payment URL
 */
const createVNPayPayment = catchAsync(async (req, res) => {
    const { orderId } = req.body;
    const userId = req.user.id;

    // Find order
    const order = await Order.findOne({
        where: { id: orderId, user_id: userId },
    });

    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found',
        });
    }

    if (order.payment_status === 'PAID') {
        return res.status(400).json({
            success: false,
            message: 'Order already paid',
        });
    }

    // Get client IP
    const ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.ip || '127.0.0.1';

    const paymentUrl = vnpayService.createPaymentUrl(order, ipAddr);

    res.status(200).json({
        success: true,
        data: { paymentUrl },
    });
});

/**
 * GET /api/v1/payments/vnpay/return
 * Handle VNPay return callback
 */
const vnpayReturn = catchAsync(async (req, res) => {
    const result = vnpayService.verifyReturnUrl(req.query);

    if (result.success) {
        // Update order payment status
        await Order.update(
            {
                payment_status: 'PAID',
                payment_transaction_id: result.transactionNo,
                status: 'CONFIRMED',
            },
            { where: { id: result.orderId } }
        );

        // Redirect to success page
        return res.redirect(`${process.env.CLIENT_URL}/payment/success?orderId=${result.orderId}`);
    } else {
        // Payment failed
        return res.redirect(`${process.env.CLIENT_URL}/payment/failed?message=${encodeURIComponent(result.message)}`);
    }
});

/**
 * POST /api/v1/payments/vnpay/ipn
 * VNPay IPN callback (server-to-server)
 */
const vnpayIPN = catchAsync(async (req, res) => {
    const result = vnpayService.verifyReturnUrl(req.query);

    if (!result.isValid) {
        return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const order = await Order.findByPk(result.orderId);

    if (!order) {
        return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    if (order.payment_status === 'PAID') {
        return res.status(200).json({ RspCode: '02', Message: 'Order already paid' });
    }

    // Verify amount
    const expectedAmount = Math.round(order.total_amount * 24000 * 100);
    if (result.amount !== expectedAmount / 100) {
        return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    if (result.success) {
        await Order.update(
            {
                payment_status: 'PAID',
                payment_transaction_id: result.transactionNo,
                status: 'CONFIRMED',
            },
            { where: { id: result.orderId } }
        );
    }

    return res.status(200).json({ RspCode: '00', Message: 'Success' });
});

module.exports = {
    createVNPayPayment,
    vnpayReturn,
    vnpayIPN,
};
