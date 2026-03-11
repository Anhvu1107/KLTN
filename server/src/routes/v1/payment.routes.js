/**
 * Payment Routes
 * AURA ARCHIVE - Payment gateway API endpoints
 */

const express = require('express');
const router = express.Router();

const paymentController = require('../../controllers/payment.controller');
const { protect } = require('../../middlewares/auth.middleware');

// VNPay Payment
router.post('/vnpay/create', protect, paymentController.createVNPayPayment);
router.get('/vnpay/return', paymentController.vnpayReturn);
router.get('/vnpay/ipn', paymentController.vnpayIPN);

// MoMo Payment
router.post('/momo/create', protect, paymentController.createMoMoPayment);
router.get('/momo/return', paymentController.momoReturn);
router.post('/momo/ipn', paymentController.momoIPN);

// PayPal Payment (International + Visa/Mastercard)
router.post('/paypal/create', protect, paymentController.createPayPalPayment);
router.get('/paypal/return', paymentController.paypalReturn);
router.post('/paypal/webhook', paymentController.paypalWebhook);

module.exports = router;
