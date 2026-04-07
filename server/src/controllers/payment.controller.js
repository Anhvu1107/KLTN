/**
 * Payment Controller
 * AURA ARCHIVE - Handle payment gateway operations
 */

const vnpayService = require('../services/vnpay.service');
const momoService = require('../services/momo.service');
const paypalService = require('../services/paypal.service');
const { Order } = require('../models');
const catchAsync = require('../utils/catchAsync');

// Prices in DB are stored in VND — no conversion needed

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

    // Verify amount (use integer math to avoid floating-point errors)
    const expectedAmountVND = Math.round(order.total_amount);
    if (Math.round(result.amount) !== expectedAmountVND) {
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

/**
 * POST /api/v1/payments/momo/create
 * Create MoMo payment URL
 */
const createMoMoPayment = catchAsync(async (req, res) => {
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

    // Prices already in VND
    const amountVND = Math.round(order.total_amount);

    const result = await momoService.createPaymentUrl({
        orderId: order.id.toString(),
        amount: amountVND,
        orderInfo: `AURA ARCHIVE - Order #${order.id}`,
    });

    if (result.success) {
        res.status(200).json({
            success: true,
            data: {
                payUrl: result.payUrl,
                qrCodeUrl: result.qrCodeUrl,
                deeplink: result.deeplink,
            },
        });
    } else {
        res.status(400).json({
            success: false,
            message: result.message || 'Failed to create MoMo payment',
        });
    }
});

/**
 * GET /api/v1/payments/momo/return
 * Handle MoMo return callback
 */
const momoReturn = catchAsync(async (req, res) => {
    const { orderId, resultCode, message } = req.query;

    // Verify MoMo signature before trusting any query params
    const isValid = momoService.verifySignature(req.query);
    if (!isValid) {
        return res.redirect(`${process.env.CLIENT_URL}/payment/failed?message=${encodeURIComponent('Invalid payment signature')}`);
    }

    if (String(resultCode) === '0') {
        // Payment successful
        await Order.update(
            {
                payment_status: 'PAID',
                payment_transaction_id: req.query.transId,
                status: 'CONFIRMED',
            },
            { where: { id: orderId } }
        );

        return res.redirect(`${process.env.CLIENT_URL}/payment/success?orderId=${orderId}`);
    } else {
        // Payment failed
        const errorMsg = momoService.getResponseMessage(parseInt(resultCode)) || message;
        return res.redirect(`${process.env.CLIENT_URL}/payment/failed?message=${encodeURIComponent(errorMsg)}`);
    }
});

/**
 * POST /api/v1/payments/momo/ipn
 * MoMo IPN callback (server-to-server)
 */
const momoIPN = catchAsync(async (req, res) => {
    const data = req.body;

    // Verify signature
    const isValid = momoService.verifySignature(data);

    if (!isValid) {
        return res.status(200).json({ resultCode: 1, message: 'Invalid signature' });
    }

    const { orderId, resultCode, transId } = data;
    const order = await Order.findByPk(orderId);

    if (!order) {
        return res.status(200).json({ resultCode: 1, message: 'Order not found' });
    }

    if (order.payment_status === 'PAID') {
        return res.status(200).json({ resultCode: 0, message: 'Order already paid' });
    }

    if (String(resultCode) === '0') {
        // Payment successful
        await Order.update(
            {
                payment_status: 'PAID',
                payment_transaction_id: transId,
                status: 'CONFIRMED',
            },
            { where: { id: orderId } }
        );
    }

    return res.status(200).json({ resultCode: 0, message: 'Success' });
});

/**
 * POST /api/v1/payments/paypal/create
 * Create PayPal payment (supports PayPal + Visa/Mastercard/AMEX)
 */
const createPayPalPayment = catchAsync(async (req, res) => {
    const { orderId } = req.body;
    const userId = req.user.id;

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

    const result = await paypalService.createPayment(order);

    if (result.success) {
        // Store PayPal order ID for later capture
        await Order.update(
            { payment_transaction_id: result.paypalOrderId },
            { where: { id: orderId } }
        );

        res.status(200).json({
            success: true,
            data: {
                approvalUrl: result.approvalUrl,
                paypalOrderId: result.paypalOrderId,
            },
        });
    } else {
        res.status(400).json({
            success: false,
            message: result.message || 'Failed to create PayPal payment',
        });
    }
});

/**
 * GET /api/v1/payments/paypal/return
 * Handle PayPal return after user approval
 */
const paypalReturn = catchAsync(async (req, res) => {
    const { token } = req.query; // PayPal sends token as query param

    if (!token) {
        return res.redirect(`${process.env.CLIENT_URL}/payment/failed?message=Missing%20payment%20token`);
    }

    // Capture the payment
    const captureResult = await paypalService.capturePayment(token);

    if (captureResult.success) {
        // Update order
        await Order.update(
            {
                payment_status: 'PAID',
                payment_transaction_id: captureResult.transactionId,
                status: 'CONFIRMED',
            },
            { where: { id: captureResult.orderId } }
        );

        return res.redirect(`${process.env.CLIENT_URL}/payment/success?orderId=${captureResult.orderId}`);
    } else {
        return res.redirect(`${process.env.CLIENT_URL}/payment/failed?message=${encodeURIComponent(captureResult.message || 'Payment failed')}`);
    }
});

/**
 * POST /api/v1/payments/paypal/webhook
 * PayPal webhook (server-to-server)
 */
const paypalWebhook = catchAsync(async (req, res) => {
    const isValid = await paypalService.verifyWebhook(req.headers, req.body);

    if (!isValid) {
        return res.status(200).json({ status: 'invalid' });
    }

    const event = req.body;

    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
        const paypalOrderId = event.resource?.id;
        if (paypalOrderId) {
            const captureResult = await paypalService.capturePayment(paypalOrderId);
            if (captureResult.success) {
                await Order.update(
                    {
                        payment_status: 'PAID',
                        payment_transaction_id: captureResult.transactionId,
                        status: 'CONFIRMED',
                    },
                    { where: { id: captureResult.orderId } }
                );
            }
        }
    }

    return res.status(200).json({ status: 'ok' });
});

module.exports = {
    createVNPayPayment,
    vnpayReturn,
    vnpayIPN,
    createMoMoPayment,
    momoReturn,
    momoIPN,
    createPayPalPayment,
    paypalReturn,
    paypalWebhook,
};

