/**
 * Authentication Middleware
 * AURA ARCHIVE - JWT token verification
 */

const { verifyAccessToken } = require('../utils/generateToken');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Protect routes - verify JWT token
 */
const protect = catchAsync(async (req, res, next) => {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('You are not logged in. Please log in to access.', 401));
    }

    try {
        // Verify token
        const decoded = verifyAccessToken(token);

        // Check if user still exists
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        // Check if user is active
        if (!user.is_active) {
            return next(new AppError('Your account has been deactivated.', 401));
        }

        // Grant access to protected route
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token. Please log in again.', 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Your token has expired. Please log in again.', 401));
        }
        return next(error);
    }
});

/**
 * Optional auth - attach user if token exists, but don't require it
 */
const optionalAuth = catchAsync(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = verifyAccessToken(token);
            const user = await User.findByPk(decoded.id);

            if (user && user.is_active) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    firstName: user.first_name,
                    lastName: user.last_name,
                };
            }
        } catch {
            // Token invalid, continue without user
        }
    }

    next();
});

module.exports = {
    protect,
    optionalAuth,
};
