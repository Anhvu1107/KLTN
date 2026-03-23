/**
 * Authentication Controller
 * AURA ARCHIVE - Handle HTTP requests for authentication
 */

const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/v1/auth/register
 * Register new user
 */
const register = catchAsync(async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    const result = await authService.register({ email, password, firstName, lastName });

    res.status(201).json({
        success: true,
        message: result.message,
        data: { email: result.email, autoVerified: result.autoVerified || false },
    });
});

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP code
 */
const verifyOtp = catchAsync(async (req, res) => {
    const { email, otp } = req.body;

    const result = await authService.verifyOtp(email, otp);

    res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: result,
    });
});

/**
 * POST /api/v1/auth/resend-otp
 * Resend OTP code
 */
const resendOtp = catchAsync(async (req, res) => {
    const { email } = req.body;

    const result = await authService.resendOtp(email);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

/**
 * POST /api/v1/auth/login
 * Login user
 */
const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
    });
});

/**
 * POST /api/v1/auth/forgot-password
 * Request password reset
 */
const forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

/**
 * POST /api/v1/auth/reset-password
 * Reset password with token
 */
const resetPassword = catchAsync(async (req, res) => {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

/**
 * POST /api/v1/auth/change-password
 * Change password (authenticated)
 */
const changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
const getMe = catchAsync(async (req, res) => {
    const user = await authService.getUserById(req.user.id);

    res.status(200).json({
        success: true,
        data: { user },
    });
});

module.exports = {
    register,
    verifyOtp,
    resendOtp,
    login,
    forgotPassword,
    resetPassword,
    changePassword,
    getMe,
};
