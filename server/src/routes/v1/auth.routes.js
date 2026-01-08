/**
 * Auth Routes
 * AURA ARCHIVE - Authentication endpoints
 */

const express = require('express');
const router = express.Router();

const authController = require('../../controllers/auth.controller');
const { protect } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const {
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    changePasswordValidator,
} = require('../../validators/auth.validator');

// Public routes
router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);

// Protected routes
router.get('/me', protect, authController.getMe);
router.post('/change-password', protect, changePasswordValidator, validate, authController.changePassword);

module.exports = router;
