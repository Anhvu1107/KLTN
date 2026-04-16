/**
 * Notification Service
 * AURA ARCHIVE - Business logic for in-app notifications
 */

const { Notification } = require('../models');

/**
 * Create a notification
 */
const createNotification = async ({ userId = null, type, title, message, data = null, isAdmin = false }) => {
    try {
        const notification = await Notification.create({
            user_id: userId,
            type,
            title,
            message,
            data,
            is_admin: isAdmin,
        });
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error.message);
        return null;
    }
};

/**
 * Notify when a new order is placed
 * Creates notifications for both user and admin
 */
const notifyNewOrder = async (order, user) => {
    // Notification for user
    await createNotification({
        userId: user.id,
        type: 'ORDER_PLACED',
        title: 'Đặt hàng thành công',
        message: `Đơn hàng #${order.order_number} đã được đặt thành công. Tổng: ${parseFloat(order.total_amount).toLocaleString('vi-VN')}₫`,
        data: { orderId: order.id, orderNumber: order.order_number },
    });

    // Notification for admin
    await createNotification({
        type: 'ORDER_PLACED',
        title: 'Đơn hàng mới',
        message: `Đơn hàng mới #${order.order_number} từ ${user.first_name || ''} ${user.last_name || ''} (${user.email}). Tổng: ${parseFloat(order.total_amount).toLocaleString('vi-VN')}₫`,
        data: { orderId: order.id, orderNumber: order.order_number, userId: user.id },
        isAdmin: true,
    });
};

/**
 * Notify when order status changes
 */
const notifyOrderStatusChange = async (order, user, newStatus) => {
    const statusMessages = {
        CONFIRMED: {
            title: 'Đơn hàng đã xác nhận',
            message: `Đơn hàng #${order.order_number} đã được xác nhận và đang được xử lý.`,
        },
        PROCESSING: {
            title: 'Đơn hàng đang xử lý',
            message: `Đơn hàng #${order.order_number} đang được đóng gói.`,
        },
        SHIPPED: {
            title: 'Đơn hàng đang giao',
            message: `Đơn hàng #${order.order_number} đã được giao cho đơn vị vận chuyển.${order.tracking_number ? ` Mã vận đơn: ${order.tracking_number}` : ''}`,
        },
        DELIVERED: {
            title: 'Giao hàng thành công',
            message: `Đơn hàng #${order.order_number} đã được giao thành công. Cảm ơn bạn đã mua sắm!`,
        },
        CANCELLED: {
            title: 'Đơn hàng đã hủy',
            message: `Đơn hàng #${order.order_number} đã bị hủy.`,
        },
    };

    const info = statusMessages[newStatus];
    if (!info) return;

    // Notification for user
    await createNotification({
        userId: user?.id || order.user_id,
        type: `ORDER_${newStatus}`,
        title: info.title,
        message: info.message,
        data: { orderId: order.id, orderNumber: order.order_number, status: newStatus },
    });

    // Admin notification for cancellation by user
    if (newStatus === 'CANCELLED') {
        await createNotification({
            type: 'ORDER_CANCELLED',
            title: 'Đơn hàng bị hủy',
            message: `Đơn hàng #${order.order_number} đã bị hủy bởi khách hàng.`,
            data: { orderId: order.id, orderNumber: order.order_number },
            isAdmin: true,
        });
    }
};

/**
 * Notify payment result
 */
const notifyPaymentResult = async (order, user, success) => {
    // User notification
    await createNotification({
        userId: user.id,
        type: success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
        title: success ? 'Thanh toán thành công' : 'Thanh toán thất bại',
        message: success
            ? `Thanh toán cho đơn hàng #${order.order_number} đã thành công.`
            : `Thanh toán cho đơn hàng #${order.order_number} không thành công. Vui lòng thử lại.`,
        data: { orderId: order.id, orderNumber: order.order_number },
    });

    // Admin notification
    await createNotification({
        type: success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
        title: success ? 'Thanh toán thành công' : 'Thanh toán thất bại',
        message: success
            ? `Thanh toán cho đơn hàng #${order.order_number} đã thành công qua ${order.payment_method}.`
            : `Thanh toán cho đơn hàng #${order.order_number} thất bại.`,
        data: { orderId: order.id, orderNumber: order.order_number },
        isAdmin: true,
    });
};

/**
 * Get user notifications
 */
const getUserNotifications = async (userId, options = {}) => {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
        where: { user_id: userId, is_admin: false },
        order: [['created_at', 'DESC']],
        limit,
        offset,
    });

    return {
        notifications: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};

/**
 * Get admin notifications
 */
const getAdminNotifications = async (options = {}) => {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
        where: { is_admin: true },
        order: [['created_at', 'DESC']],
        limit,
        offset,
    });

    return {
        notifications: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId = null) => {
    const where = { id: notificationId };
    if (userId) where.user_id = userId;

    const notification = await Notification.findOne({ where });
    if (!notification) return null;

    await notification.update({ is_read: true });
    return notification;
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId = null, isAdmin = false) => {
    const where = { is_read: false };

    if (isAdmin) {
        where.is_admin = true;
    } else if (userId) {
        where.user_id = userId;
        where.is_admin = false;
    }

    await Notification.update({ is_read: true }, { where });
    return { message: 'All notifications marked as read' };
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (userId = null, isAdmin = false) => {
    const where = { is_read: false };

    if (isAdmin) {
        where.is_admin = true;
    } else if (userId) {
        where.user_id = userId;
        where.is_admin = false;
    }

    const count = await Notification.count({ where });
    return { count };
};

module.exports = {
    createNotification,
    notifyNewOrder,
    notifyOrderStatusChange,
    notifyPaymentResult,
    getUserNotifications,
    getAdminNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
};
