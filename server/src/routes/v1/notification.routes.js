/**
 * Notification Routes
 * AURA ARCHIVE - User notification endpoints
 */

const express = require('express');
const router = express.Router();

const notificationController = require('../../controllers/notification.controller');
const { protect } = require('../../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// User notification routes
router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
