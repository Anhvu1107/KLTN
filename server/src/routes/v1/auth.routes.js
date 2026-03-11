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
    verifyOtpValidator,
    resendOtpValidator,
} = require('../../validators/auth.validator');

// Public routes
router.post('/register', registerValidator, validate, authController.register);
router.post('/verify-otp', verifyOtpValidator, validate, authController.verifyOtp);
router.post('/resend-otp', resendOtpValidator, validate, authController.resendOtp);
router.post('/login', loginValidator, validate, authController.login);
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);

// Protected routes
router.get('/me', protect, authController.getMe);
router.post('/change-password', protect, changePasswordValidator, validate, authController.changePassword);

// OAuth routes
const oauthService = require('../../services/oauth.service');
router.post('/google', async (req, res, next) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ success: false, message: 'ID token required' });
        }
        const result = await oauthService.googleAuth(idToken);
        res.status(200).json({ success: true, message: 'Login successful', data: result });
    } catch (error) {
        next(error);
    }
});

router.post('/facebook', async (req, res, next) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ success: false, message: 'Access token required' });
        }
        const result = await oauthService.facebookAuth(accessToken);
        res.status(200).json({ success: true, message: 'Login successful', data: result });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
