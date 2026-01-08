/**
 * Order Routes
 * AURA ARCHIVE - Order API endpoints
 */

const express = require('express');
const router = express.Router();

const orderController = require('../../controllers/order.controller');
const { protect } = require('../../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Create new order (Checkout)
router.post('/', orderController.createOrder);

// Get current user's orders
router.get('/', orderController.getMyOrders);

// Check item availability before checkout
router.post('/check-availability', orderController.checkAvailability);

// Get order by ID
router.get('/:id', orderController.getOrderById);

// Cancel order
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;
