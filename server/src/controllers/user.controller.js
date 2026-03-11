/**
 * User Controller
 * AURA ARCHIVE - Handle user profile and account requests
 */

const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/users/profile
 * Get current user profile
 */
const getProfile = catchAsync(async (req, res) => {
    const user = await userService.getProfile(req.user.id);

    res.status(200).json({
        success: true,
        data: { user },
    });
});

/**
 * PUT /api/v1/users/profile
 * Update current user profile
 */
const updateProfile = catchAsync(async (req, res) => {
    const user = await userService.updateProfile(req.user.id, req.body);

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
    });
});

/**
 * PUT /api/v1/users/password
 * Change password
 */
const changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Current password and new password are required',
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'New password must be at least 6 characters',
        });
    }

    const result = await userService.changePassword(req.user.id, currentPassword, newPassword);

    res.status(200).json({
        success: true,
        ...result,
    });
});

/**
 * GET /api/v1/users/orders
 * Get order history
 */
const getOrderHistory = catchAsync(async (req, res) => {
    const result = await userService.getOrderHistory(req.user.id, req.query);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/users/orders/:id
 * Get order detail
 */
const getOrderDetail = catchAsync(async (req, res) => {
    const order = await userService.getOrderDetail(req.user.id, req.params.id);

    res.status(200).json({
        success: true,
        data: { order },
    });
});

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    getOrderHistory,
    getOrderDetail,
};
