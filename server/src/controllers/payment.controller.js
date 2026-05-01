/**
 * Payment Controller
 * AURA ARCHIVE - Handle payment gateway operations
 */

const vnpayService = require('../services/vnpay.service');
const momoService = require('../services/momo.service');
const paypalService = require('../services/paypal.service');
const { Order, OrderItem, Variant, sequelize } = require('../models');
const catchAsync = require('../utils/catchAsync');
const abandonedCartService = require('../services/abandoned-cart.service');

const ONLINE_PAYMENT_METHODS = ['MOMO', 'VNPAY', 'PAYPAL'];

const getOrderAmountVND = (order) => {
    const amount = Number(order?.total_amount);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return Math.round(amount);
};

const markZeroAmountOrderPaid = async (order) => {
    if (getOrderAmountVND(order) > 0 || order.payment_status === 'PAID') {
        return false;
    }

    await order.update({
        payment_status: 'PAID',
        payment_transaction_id: order.payment_transaction_id || 'FREE_ORDER',
    });

    return true;
};

const sendZeroAmountPaidResponse = (res, order) => res.status(200).json({
    success: true,
    message: 'Order total is 0; no payment is required.',
    data: {
        alreadyPaid: true,
        orderId: order.id,
    },
});

const getClientIp = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }

    return req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.ip ||
        '127.0.0.1';
};

const isOrderOpenForPayment = (order) => {
    if (!order) return false;
    if (order.status !== 'PENDING') return false;
    return !['PAID', 'REFUNDED'].includes(order.payment_status);
};

const getNotPayableMessage = (order) => {
    if (!order) return 'Order not found';
    if (order.status === 'CANCELLED') return 'Order has been cancelled';
    if (order.payment_status === 'PAID') return 'Order already paid';
    if (order.payment_status === 'REFUNDED') return 'Order has been refunded';
    return 'Order is not payable';
};

const releaseOrderInventory = async (order, transaction) => {
    const orderItems = await OrderItem.findAll({
        where: { order_id: order.id },
        transaction,
    });

    for (const item of orderItems) {
        const variant = await Variant.findByPk(item.variant_id, {
            lock: transaction.LOCK.UPDATE,
            transaction,
        });

        if (!variant) continue;

        const restoredStock = Number(variant.stock_quantity || 0) + Number(item.quantity || 0);
        await variant.update({
            stock_quantity: restoredStock,
            status: 'AVAILABLE',
            reserved_at: null,
            reserved_by: null,
            sold_at: null,
        }, { transaction });
    }
};

const ensureOrderCanStartPayment = (order, res, expectedPaymentMethod = null) => {
    if (isOrderOpenForPayment(order)) return true;
    if (expectedPaymentMethod && order?.payment_method !== expectedPaymentMethod) {
        res.status(400).json({
            success: false,
            message: 'Payment method has changed',
        });
        return false;
    }

    res.status(400).json({
        success: false,
        message: getNotPayableMessage(order),
    });

    return false;
};

const updateOrderAfterGatewayResult = async (result, expectedPaymentMethod = null) => {
    if (!result.orderId) return { updated: false, reason: 'missing_order_id' };

    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findByPk(result.orderId, {
            lock: transaction.LOCK.UPDATE,
            transaction,
        });

        if (!order) {
            await transaction.rollback();
            return { updated: false, reason: 'order_not_found' };
        }

        if (order.payment_status === 'PAID') {
            await transaction.rollback();
            return { updated: false, reason: 'already_paid', order };
        }

        if (!isOrderOpenForPayment(order)) {
            await transaction.rollback();
            return { updated: false, reason: 'order_not_payable', order };
        }

        if (expectedPaymentMethod && order.payment_method !== expectedPaymentMethod) {
            await transaction.rollback();
            return { updated: false, reason: 'payment_method_changed', order };
        }

        if (Number.isFinite(result.amount) && result.amount > 0 && Math.round(result.amount) !== getOrderAmountVND(order)) {
            await transaction.rollback();
            return { updated: false, reason: 'invalid_amount', order };
        }

        const updateData = result.success
            ? {
                payment_status: 'PAID',
                payment_transaction_id: result.transactionNo,
                status: 'CONFIRMED',
            }
            : {
                payment_status: 'FAILED',
                payment_transaction_id: result.transactionNo || order.payment_transaction_id,
            };

        if (!result.success && ONLINE_PAYMENT_METHODS.includes(order.payment_method)) {
            updateData.status = 'CANCELLED';
            updateData.cancelled_at = new Date();
            await releaseOrderInventory(order, transaction);
        }

        await order.update(updateData, { transaction });
        await transaction.commit();

        if (result.success) {
            abandonedCartService.markLatestCartAsConverted(order.user_id).catch((error) => {
                console.error('Failed to mark abandoned cart as converted after payment:', error.message);
            });
        } else if (ONLINE_PAYMENT_METHODS.includes(order.payment_method)) {
            abandonedCartService.reactivateLatestConvertedCart(order.user_id).catch((error) => {
                console.error('Failed to reactivate abandoned cart after failed payment:', error.message);
            });
        }

        return { updated: true, order };
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        throw error;
    }
};

// Prices in DB are stored in VND — no conversion needed

/**
 * POST /api/v1/payments/vnpay/create
 * Create VNPay payment URL
 */
const createVNPayPayment = catchAsync(async (req, res) => {
    const { orderId, bankCode } = req.body;
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

    if (!ensureOrderCanStartPayment(order, res, 'VNPAY')) {
        return;
    }

    if (getOrderAmountVND(order) === 0) {
        await markZeroAmountOrderPaid(order);
        return sendZeroAmountPaidResponse(res, order);
    }

    const ipAddr = getClientIp(req);

    const paymentUrl = vnpayService.createPaymentUrl(order, ipAddr, { bankCode });

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
        // Local sandbox fallback: IPN is the source of truth when VNPAY can call a public URL.
        const updateResult = await updateOrderAfterGatewayResult(result, 'VNPAY');

        if (!updateResult.updated && updateResult.reason !== 'already_paid') {
            return res.redirect(`${process.env.CLIENT_URL}/payment/failed?message=${encodeURIComponent(getNotPayableMessage(updateResult.order))}`);
        }

        // Redirect to success page
        return res.redirect(`${process.env.CLIENT_URL}/payment/success?orderId=${result.orderId}`);
    } else {
        if (result.isValid) {
            await updateOrderAfterGatewayResult(result, 'VNPAY');
        }

        // Payment failed
        return res.redirect(`${process.env.CLIENT_URL}/payment/failed?orderId=${encodeURIComponent(result.orderId || '')}&message=${encodeURIComponent(result.message)}`);
    }
});

/**
 * GET /api/v1/payments/vnpay/ipn
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

    if (!isOrderOpenForPayment(order)) {
        return res.status(200).json({ RspCode: '02', Message: getNotPayableMessage(order) });
    }

    if (order.payment_method !== 'VNPAY') {
        return res.status(200).json({ RspCode: '02', Message: 'Payment method changed' });
    }

    // Verify amount (use integer math to avoid floating-point errors)
    const expectedAmountVND = getOrderAmountVND(order);
    if (Math.round(result.amount) !== expectedAmountVND) {
        return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    await updateOrderAfterGatewayResult(result, 'VNPAY');

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

    if (!ensureOrderCanStartPayment(order, res, 'MOMO')) {
        return;
    }

    if (getOrderAmountVND(order) === 0) {
        await markZeroAmountOrderPaid(order);
        return sendZeroAmountPaidResponse(res, order);
    }

    // Prices already in VND
    const amountVND = getOrderAmountVND(order);

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
        const updateResult = await updateOrderAfterGatewayResult({
            success: true,
            orderId,
            transactionNo: req.query.transId,
            amount: Number(req.query.amount || 0),
        }, 'MOMO');

        if (!updateResult.updated && updateResult.reason !== 'already_paid') {
            return res.redirect(`${process.env.CLIENT_URL}/payment/failed?orderId=${encodeURIComponent(orderId || '')}&message=${encodeURIComponent(getNotPayableMessage(updateResult.order))}`);
        }

        return res.redirect(`${process.env.CLIENT_URL}/payment/success?orderId=${orderId}`);
    } else {
        await updateOrderAfterGatewayResult({
            success: false,
            orderId,
            transactionNo: req.query.transId,
            amount: Number(req.query.amount || 0),
        }, 'MOMO');

        // Payment failed
        const errorMsg = momoService.getResponseMessage(parseInt(resultCode)) || message;
        return res.redirect(`${process.env.CLIENT_URL}/payment/failed?orderId=${encodeURIComponent(orderId || '')}&message=${encodeURIComponent(errorMsg)}`);
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

    if (!isOrderOpenForPayment(order)) {
        return res.status(200).json({ resultCode: 0, message: getNotPayableMessage(order) });
    }

    if (order.payment_method !== 'MOMO') {
        return res.status(200).json({ resultCode: 0, message: 'Payment method changed' });
    }

    await updateOrderAfterGatewayResult({
        success: String(resultCode) === '0',
        orderId,
        transactionNo: transId,
        amount: Number(data.amount || 0),
    }, 'MOMO');

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

    if (!ensureOrderCanStartPayment(order, res, 'PAYPAL')) {
        return;
    }

    if (getOrderAmountVND(order) === 0) {
        await markZeroAmountOrderPaid(order);
        return sendZeroAmountPaidResponse(res, order);
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
        const updateResult = await updateOrderAfterGatewayResult({
            success: true,
            orderId: captureResult.orderId,
            transactionNo: captureResult.transactionId,
        }, 'PAYPAL');

        if (!updateResult.updated && updateResult.reason !== 'already_paid') {
            return res.redirect(`${process.env.CLIENT_URL}/payment/failed?orderId=${encodeURIComponent(captureResult.orderId || '')}&message=${encodeURIComponent(getNotPayableMessage(updateResult.order))}`);
        }

        return res.redirect(`${process.env.CLIENT_URL}/payment/success?orderId=${captureResult.orderId}`);
    } else {
        if (captureResult.orderId) {
            await updateOrderAfterGatewayResult({
                success: false,
                orderId: captureResult.orderId,
                transactionNo: captureResult.transactionId,
            }, 'PAYPAL');
        }

        return res.redirect(`${process.env.CLIENT_URL}/payment/failed?orderId=${encodeURIComponent(captureResult.orderId || '')}&message=${encodeURIComponent(captureResult.message || 'Payment failed')}`);
    }
});

/**
 * GET /api/v1/payments/paypal/cancel
 * Handle PayPal cancellation.
 */
const paypalCancel = catchAsync(async (req, res) => {
    const { orderId } = req.query;

    if (orderId) {
        await updateOrderAfterGatewayResult({
            success: false,
            orderId,
            transactionNo: 'PAYPAL_CANCELLED',
        }, 'PAYPAL');
    }

    return res.redirect(`${process.env.CLIENT_URL}/payment/failed?orderId=${encodeURIComponent(orderId || '')}&message=${encodeURIComponent('Payment cancelled')}`);
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
                await updateOrderAfterGatewayResult({
                    success: true,
                    orderId: captureResult.orderId,
                    transactionNo: captureResult.transactionId,
                }, 'PAYPAL');
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
    paypalCancel,
    paypalWebhook,
};

