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

module.exports = router;
