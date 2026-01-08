/**
 * Admin Middleware
 * AURA ARCHIVE - Role-based access control
 */

const AppError = require('../utils/AppError');

/**
 * Restrict access to admin users only
 */
const adminOnly = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('You must be logged in to access this resource.', 401));
    }

    if (req.user.role !== 'ADMIN') {
        return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
};

/**
 * Restrict to specific roles
 * @param  {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('You must be logged in to access this resource.', 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action.', 403));
        }

        next();
    };
};

module.exports = {
    adminOnly,
    restrictTo,
};
