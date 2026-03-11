/**
 * Notification Controller
 * AURA ARCHIVE - Handle HTTP requests for notifications
 */

const notificationService = require('../services/notification.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/notifications
 * Get current user's notifications
 */
const getMyNotifications = catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await notificationService.getUserNotifications(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit),
    });

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/notifications/unread-count
 * Get unread count for current user
 */
const getUnreadCount = catchAsync(async (req, res) => {
    const result = await notificationService.getUnreadCount(req.user.id);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a notification as read
 */
const markAsRead = catchAsync(async (req, res) => {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: 'Notification not found',
        });
    }

    res.status(200).json({
        success: true,
        message: 'Notification marked as read',
    });
});

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read
 */
const markAllAsRead = catchAsync(async (req, res) => {
    await notificationService.markAllAsRead(req.user.id);

    res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
    });
});

/**
 * GET /api/v1/admin/notifications
 * Get admin notifications
 */
const getAdminNotifications = catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await notificationService.getAdminNotifications({
        page: parseInt(page),
        limit: parseInt(limit),
    });

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/admin/notifications/unread-count
 * Get admin unread count
 */
const getAdminUnreadCount = catchAsync(async (req, res) => {
    const result = await notificationService.getUnreadCount(null, true);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * PATCH /api/v1/admin/notifications/:id/read
 * Mark admin notification as read
 */
const markAdminAsRead = catchAsync(async (req, res) => {
    const notification = await notificationService.markAsRead(req.params.id);

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: 'Notification not found',
        });
    }

    res.status(200).json({
        success: true,
        message: 'Notification marked as read',
    });
});

/**
 * PATCH /api/v1/admin/notifications/read-all
 * Mark all admin notifications as read
 */
const markAllAdminAsRead = catchAsync(async (req, res) => {
    await notificationService.markAllAsRead(null, true);

    res.status(200).json({
        success: true,
        message: 'All admin notifications marked as read',
    });
});

module.exports = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    getAdminNotifications,
    getAdminUnreadCount,
    markAdminAsRead,
    markAllAdminAsRead,
};
