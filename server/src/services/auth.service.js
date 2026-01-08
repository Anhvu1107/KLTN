/**
 * Authentication Service
 * AURA ARCHIVE - Business logic for authentication
 */

const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { generateAccessToken, generateRandomToken, hashToken } = require('../utils/generateToken');
const { sendPasswordResetEmail } = require('../utils/sendEmail');
const AppError = require('../utils/AppError');

/**
 * Register a new user
 * @param {Object} userData - User data { email, password, firstName, lastName }
 * @returns {Object} - { user, token }
 */
const register = async ({ email, password, firstName, lastName }) => {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
        throw new AppError('Email already registered', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: 'CUSTOMER',
    });

    // Generate token
    const token = generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
    });

    return {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
        },
        token,
    };
};

/**
 * Login user
 * @param {Object} credentials - { email, password }
 * @returns {Object} - { user, token }
 */
const login = async ({ email, password }) => {
    // Find user by email
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
        throw new AppError('Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.is_active) {
        throw new AppError('Account is deactivated. Please contact support.', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
    }

    // Update last login
    await user.update({ last_login_at: new Date() });

    // Generate token
    const token = generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
    });

    return {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            avatarUrl: user.avatar_url,
        },
        token,
    };
};

/**
 * Forgot password - Generate reset token and send email
 * @param {string} email - User email
 * @returns {Object} - { message }
 */
const forgotPassword = async (email) => {
    // Find user
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
        // Don't reveal if email exists (security)
        return { message: 'If the email exists, a reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const hashedToken = hashToken(resetToken);

    // Save to database (expires in 1 hour)
    await user.update({
        reset_token: hashedToken,
        reset_token_expires: new Date(Date.now() + 60 * 60 * 1000),
    });

    // Send email with plain token (not hashed)
    try {
        await sendPasswordResetEmail(
            user.email,
            resetToken,
            user.first_name || 'Valued Customer'
        );
    } catch (error) {
        // Clear reset token if email fails
        await user.update({
            reset_token: null,
            reset_token_expires: null,
        });
        throw new AppError('Failed to send reset email. Please try again.', 500);
    }

    return { message: 'If the email exists, a reset link has been sent.' };
};

/**
 * Reset password using token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Object} - { message }
 */
const resetPassword = async (token, newPassword) => {
    // Hash the token to compare with database
    const hashedToken = hashToken(token);

    // Find user with valid token
    const user = await User.findOne({
        where: {
            reset_token: hashedToken,
        },
    });

    if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
    }

    // Check if token is expired
    if (user.reset_token_expires < new Date()) {
        throw new AppError('Reset token has expired', 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    await user.update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
    });

    return { message: 'Password reset successful. You can now login.' };
};

/**
 * Change password (authenticated user)
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} - { message }
 */
const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await user.update({ password_hash: passwordHash });

    return { message: 'Password changed successfully.' };
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Object} - User data
 */
const getUserById = async (userId) => {
    const user = await User.findByPk(userId, {
        attributes: ['id', 'email', 'first_name', 'last_name', 'phone', 'avatar_url', 'role', 'created_at'],
    });

    if (!user) {
        throw new AppError('User not found', 404);
    }

    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        role: user.role,
        createdAt: user.created_at,
    };
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword,
    changePassword,
    getUserById,
};
