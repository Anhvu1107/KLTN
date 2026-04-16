/**
 * Error Middleware
 * AURA ARCHIVE - Global error handling
 */

const logger = require('../utils/logger');

/**
 * Global error handler
 */
const errorHandler = (err, req, res, _next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error
    if (err.statusCode >= 500) {
        logger.error(err.stack || err.message);
    } else {
        logger.warn(err.message);
    }

    if (process.env.NODE_ENV === 'development') {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
            stack: err.stack,
            error: err,
        });
    }

    // Production - don't leak error details
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
        });
    }

    // Programming or unknown errors - include message for debugging
    return res.status(500).json({
        success: false,
        status: 'error',
        message: err.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    });
};

/**
 * Handle 404 - Route not found
 */
const notFound = (req, res, next) => {
    const error = new Error(`Not found - ${req.originalUrl}`);
    error.statusCode = 404;
    error.status = 'fail';
    error.isOperational = true;
    next(error);
};

module.exports = {
    errorHandler,
    notFound,
};
