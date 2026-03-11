/**
 * User Routes
 * AURA ARCHIVE - User profile and account endpoints
 */

const express = require('express');
const router = express.Router();

const userController = require('../../controllers/user.controller');
const { protect } = require('../../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Profile
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/password', userController.changePassword);

// Orders
router.get('/orders', userController.getOrderHistory);
router.get('/orders/:id', userController.getOrderDetail);

module.exports = router;
