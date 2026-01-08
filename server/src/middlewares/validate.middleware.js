/**
 * Validation Middleware
 * AURA ARCHIVE - Process express-validator results
 */

const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Check for validation errors and return formatted response
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
        }));

        return next(new AppError(errorMessages[0].message, 400));
    }

    next();
};

module.exports = validate;
