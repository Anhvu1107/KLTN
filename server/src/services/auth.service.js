/**
 * Authentication Service
 * AURA ARCHIVE - Business logic for authentication
 */

const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { generateAccessToken, generateRandomToken, hashToken } = require('../utils/generateToken');
const { sendPasswordResetEmail, sendOtpEmail } = require('../utils/sendEmail');
const AppError = require('../utils/AppError');

/**
 * Generate 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Register a new user (sends OTP, does NOT auto-login)
 */
const register = async ({ email, password, firstName, lastName }) => {
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });

    if (existingUser) {
        if (!existingUser.is_verified) {
            const otpCode = generateOtp();
            await existingUser.update({
                otp_code: otpCode,
                otp_expires: new Date(Date.now() + 10 * 60 * 1000),
                first_name: firstName || existingUser.first_name,
                last_name: lastName || existingUser.last_name,
            });

            if (password) {
                const salt = await bcrypt.genSalt(12);
                const passwordHash = await bcrypt.hash(password, salt);
                await existingUser.update({ password_hash: passwordHash });
            }

            try {
                await sendOtpEmail(
                    existingUser.email,
                    otpCode,
                    firstName || existingUser.first_name || 'Quý khách'
                );
            } catch (error) {
                console.error('Failed to send OTP email:', error.message);
                throw new AppError('Không thể gửi email xác thực. Vui lòng thử lại.', 500);
            }

            return {
                message: 'Mã xác thực đã được gửi tới email của bạn.',
                email: existingUser.email,
            };
        }

        throw new AppError('Email này đã được đăng ký', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const otpCode = generateOtp();

    const user = await User.create({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: 'CUSTOMER',
        is_verified: false,
        otp_code: otpCode,
        otp_expires: new Date(Date.now() + 10 * 60 * 1000),
    });

    try {
        await sendOtpEmail(
            user.email,
            otpCode,
            firstName || 'Quý khách'
        );
        return {
            message: 'Đăng ký thành công. Vui lòng kiểm tra email để nhận mã xác thực.',
            email: user.email,
        };
    } catch (error) {
        console.error('Failed to send OTP email:', error.message);
        // Auto-verify when email service unavailable
        await user.update({ is_verified: true, otp_code: null, otp_expires: null });
        console.log(`⚠ Auto-verified user ${user.email} (email unavailable)`);
        return {
            message: 'Đăng ký thành công! Tài khoản đã được kích hoạt.',
            email: user.email,
            autoVerified: true,
        };
    }
};

/**
 * Verify OTP code
 */
const verifyOtp = async (email, otpCode) => {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
        throw new AppError('Không tìm thấy tài khoản', 404);
    }

    if (user.is_verified) {
        throw new AppError('Email đã được xác thực rồi', 400);
    }

    if (!user.otp_code || !user.otp_expires) {
        throw new AppError('Không tìm thấy mã OTP. Vui lòng yêu cầu mã mới.', 400);
    }

    if (new Date() > user.otp_expires) {
        throw new AppError('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.', 400);
    }

    if (user.otp_code !== otpCode) {
        throw new AppError('Mã OTP không đúng', 400);
    }

    await user.update({
        is_verified: true,
        otp_code: null,
        otp_expires: null,
        last_login_at: new Date(),
    });

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
 * Resend OTP code
 */
const resendOtp = async (email) => {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
        return { message: 'Nếu email tồn tại, mã xác thực mới đã được gửi.' };
    }

    if (user.is_verified) {
        throw new AppError('Email đã được xác thực rồi', 400);
    }

    const otpCode = generateOtp();

    await user.update({
        otp_code: otpCode,
        otp_expires: new Date(Date.now() + 10 * 60 * 1000),
    });

    try {
        await sendOtpEmail(
            user.email,
            otpCode,
            user.first_name || 'Quý khách'
        );
    } catch (error) {
        console.error('Failed to resend OTP:', error.message);
        throw new AppError('Không thể gửi email xác thực. Vui lòng thử lại.', 500);
    }

    return { message: 'Mã xác thực mới đã được gửi tới email của bạn.' };
};

/**
 * Login user
 * Admin accounts bypass OTP verification
 */
const login = async ({ email, password }) => {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
        throw new AppError('Email hoặc mật khẩu không đúng', 401);
    }

    if (!user.is_active) {
        throw new AppError('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ.', 401);
    }

    // Admin accounts bypass OTP verification
    if (!user.is_verified && user.role !== 'ADMIN') {
        throw new AppError('Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư để nhận mã xác thực.', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
        throw new AppError('Email hoặc mật khẩu không đúng', 401);
    }

    await user.update({ last_login_at: new Date() });

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
            phone: user.phone,
            address: user.address,
            city: user.city,
            district: user.district,
            ward: user.ward,
            role: user.role,
            avatarUrl: user.avatar_url,
        },
        token,
    };
};

/**
 * Forgot password
 */
const forgotPassword = async (email) => {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
        return { message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.' };
    }

    const resetToken = generateRandomToken();
    const hashedToken = hashToken(resetToken);

    await user.update({
        reset_token: hashedToken,
        reset_token_expires: new Date(Date.now() + 60 * 60 * 1000),
    });

    try {
        await sendPasswordResetEmail(
            user.email,
            resetToken,
            user.first_name || 'Quý khách'
        );
    } catch {
        await user.update({
            reset_token: null,
            reset_token_expires: null,
        });
        throw new AppError('Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.', 500);
    }

    return { message: 'Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.' };
};

/**
 * Reset password using token
 */
const resetPassword = async (token, newPassword) => {
    const hashedToken = hashToken(token);

    const user = await User.findOne({
        where: {
            reset_token: hashedToken,
        },
    });

    if (!user) {
        throw new AppError('Token đặt lại không hợp lệ hoặc đã hết hạn', 400);
    }

    if (user.reset_token_expires < new Date()) {
        throw new AppError('Token đặt lại đã hết hạn', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await user.update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
    });

    return { message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.' };
};

/**
 * Change password (authenticated user)
 */
const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await User.findByPk(userId);
    if (!user) {
        throw new AppError('Không tìm thấy tài khoản', 404);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
        throw new AppError('Mật khẩu hiện tại không đúng', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await user.update({ password_hash: passwordHash });

    return { message: 'Đổi mật khẩu thành công.' };
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
    const user = await User.findByPk(userId, {
        attributes: ['id', 'email', 'first_name', 'last_name', 'phone', 'avatar_url', 'role', 'created_at', 'address', 'city', 'district', 'ward'],
    });

    if (!user) {
        throw new AppError('Không tìm thấy tài khoản', 404);
    }

    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        address: user.address,
        city: user.city,
        district: user.district,
        ward: user.ward,
        avatarUrl: user.avatar_url,
        role: user.role,
        createdAt: user.created_at,
    };
};

module.exports = {
    register,
    verifyOtp,
    resendOtp,
    login,
    forgotPassword,
    resetPassword,
    changePassword,
    getUserById,
};

