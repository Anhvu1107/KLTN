/**
 * Admin Routes
 * AURA ARCHIVE - Admin API endpoints (protected)
 */

const express = require('express');
const router = express.Router();

const adminController = require('../../controllers/admin.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { adminOnly } = require('../../middlewares/admin.middleware');

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// Dashboard
router.get('/stats', adminController.getStats);
router.get('/revenue/monthly', adminController.getMonthlyRevenue);

// Orders management
router.get('/orders', adminController.getAllOrders);
router.get('/orders/recent', adminController.getRecentOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

// System prompts (AI configuration)
router.get('/system-prompts', adminController.getSystemPrompts);
router.get('/system-prompts/:key', adminController.getSystemPromptByKey);
router.put('/system-prompts/:key', adminController.updateSystemPrompt);

// Products management
router.get('/products', adminController.getProducts);
router.post('/products', adminController.createProduct);

// Users management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.patch('/users/:id/status', adminController.updateUserStatus);

module.exports = router;
