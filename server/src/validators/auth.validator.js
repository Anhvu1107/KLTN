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
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&~#^()_+=\-\[\]{}|\\:";'<>,.?/])[A-Za-z\d@$!%*?&~#^()_+=\-\[\]{}|\\:";'<>,.?/]{8,}$/;

const registerValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(PASSWORD_REGEX)
        .withMessage('Password must contain at least one uppercase, one lowercase, one number, and one special character')
        .custom((value) => {
            if (COMMON_PASSWORDS.includes(value.toLowerCase())) {
                throw new Error('This password is too common. Please choose a stronger password.');
            }
            return true;
        }),
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be between 1 and 100 characters'),
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name must be between 1 and 100 characters'),
];

const loginValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

const forgotPasswordValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
];

const resetPasswordValidator = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(PASSWORD_REGEX)
        .withMessage('Password must contain at least one uppercase, one lowercase, one number, and one special character')
        .custom((value) => {
            if (COMMON_PASSWORDS.includes(value.toLowerCase())) {
                throw new Error('This password is too common. Please choose a stronger password.');
            }
            return true;
        }),
];

const changePasswordValidator = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters')
        .matches(PASSWORD_REGEX)
        .withMessage('Password must contain at least one uppercase, one lowercase, one number, and one special character')
        .custom((value) => {
            if (COMMON_PASSWORDS.includes(value.toLowerCase())) {
                throw new Error('This password is too common. Please choose a stronger password.');
            }
            return true;
        }),
];

module.exports = {
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    changePasswordValidator,
};
