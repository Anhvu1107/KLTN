/**
 * Newsletter Controller
 * AURA ARCHIVE - Handle newsletter subscriptions
 */

const { Newsletter } = require('../models');
const AppError = require('../utils/AppError');

/**
 * Subscribe to newsletter
 * POST /api/v1/newsletter/subscribe
 */
const subscribe = async (req, res, next) => {
    try {
        const { email } = req.body;

        // Validation
        if (!email) {
            throw new AppError('Email is required', 400);
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new AppError('Invalid email format', 400);
        }

        // Check if already subscribed
        const existing = await Newsletter.findOne({
            where: { email: email.toLowerCase() }
        });

        if (existing) {
            if (existing.is_active) {
                return res.status(200).json({
                    success: true,
                    message: 'You are already subscribed to our newsletter.',
                });
            } else {
                // Reactivate subscription
                await existing.update({
                    is_active: true,
                    unsubscribed_at: null,
                    subscribed_at: new Date(),
                });
                return res.status(200).json({
                    success: true,
                    message: 'Welcome back! You have been resubscribed.',
                });
            }
        }

        // Create new subscription
        await Newsletter.create({
            email: email.toLowerCase(),
        });

        res.status(201).json({
            success: true,
            message: 'Thank you for subscribing to our newsletter!',
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Unsubscribe from newsletter
 * POST /api/v1/newsletter/unsubscribe
 */
const unsubscribe = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new AppError('Email is required', 400);
        }

        const subscription = await Newsletter.findOne({
            where: { email: email.toLowerCase() }
        });

        if (!subscription) {
            return res.status(200).json({
                success: true,
                message: 'Email not found in our newsletter list.',
            });
        }

        await subscription.update({
            is_active: false,
            unsubscribed_at: new Date(),
        });

        res.status(200).json({
            success: true,
            message: 'You have been unsubscribed from our newsletter.',
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    subscribe,
    unsubscribe,
};
