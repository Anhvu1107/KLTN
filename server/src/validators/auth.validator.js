/**
 * Auth Validator
 * AURA ARCHIVE - Request validation for authentication
 */

const { body } = require('express-validator');

// Common weak passwords that should be blocked
const COMMON_PASSWORDS = [
    'password', 'password1', 'password123', '12345678', '123456789',
    'qwerty123', 'abc12345', 'letmein', 'welcome', 'monkey123',
    'dragon123', 'master123', 'admin123', 'login123', 'welcome1',
];

// Password regex: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[[@$!%*?&~#^()_+=\-\]{}|\\:";'<>,.?/])[A-Za-z\d[@$!%*?&~#^()_+=\-\]{}|\\:";'<>,.?/]{8,}$/;

const registerValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Vui lòng nhập email hợp lệ')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Mật khẩu phải có ít nhất 8 ký tự')
        .matches(PASSWORD_REGEX)
        .withMessage('Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt')
        .custom((value) => {
            if (COMMON_PASSWORDS.includes(value.toLowerCase())) {
                throw new Error('Mật khẩu này quá phổ biến. Vui lòng chọn mật khẩu mạnh hơn.');
            }
            return true;
        }),
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Tên phải từ 1 đến 100 ký tự'),
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Họ phải từ 1 đến 100 ký tự'),
];

const loginValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Vui lòng nhập email hợp lệ')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Vui lòng nhập mật khẩu'),
];

const forgotPasswordValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Vui lòng nhập email hợp lệ')
        .normalizeEmail(),
];

const resetPasswordValidator = [
    body('token')
        .notEmpty()
        .withMessage('Token đặt lại không hợp lệ'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Mật khẩu phải có ít nhất 8 ký tự')
        .matches(PASSWORD_REGEX)
        .withMessage('Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt')
        .custom((value) => {
            if (COMMON_PASSWORDS.includes(value.toLowerCase())) {
                throw new Error('Mật khẩu này quá phổ biến. Vui lòng chọn mật khẩu mạnh hơn.');
            }
            return true;
        }),
];

const changePasswordValidator = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Vui lòng nhập mật khẩu hiện tại'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Mật khẩu mới phải có ít nhất 8 ký tự')
        .matches(PASSWORD_REGEX)
        .withMessage('Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt')
        .custom((value) => {
            if (COMMON_PASSWORDS.includes(value.toLowerCase())) {
                throw new Error('Mật khẩu này quá phổ biến. Vui lòng chọn mật khẩu mạnh hơn.');
            }
            return true;
        }),
];

const verifyOtpValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('otp')
        .trim()
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits')
        .isNumeric()
        .withMessage('OTP must contain only numbers'),
];

const resendOtpValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
];

module.exports = {
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    changePasswordValidator,
    verifyOtpValidator,
    resendOtpValidator,
};
