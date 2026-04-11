/**
 * Order Validator
 * AURA ARCHIVE - Request validation for orders
 */

const { body } = require('express-validator');

const createOrderValidator = [
    body('items')
        .isArray({ min: 1 })
        .withMessage('At least one item is required'),
    body('items.*.variantId')
        .isUUID()
        .withMessage('Valid variant ID is required'),
    body('paymentMethod')
        .isIn(['COD', 'BANK_TRANSFER', 'CREDIT_CARD', 'MOMO', 'VNPAY', 'PAYPAL'])
        .withMessage('Invalid payment method'),
    body('shippingAddress')
        .isObject()
        .withMessage('Shipping address is required'),
    body('shippingAddress.fullName')
        .notEmpty()
        .withMessage('Full name is required'),
    body('shippingAddress.phone')
        .notEmpty()
        .withMessage('Phone is required'),
    body('shippingAddress.address')
        .notEmpty()
        .withMessage('Address is required'),
    body('shippingAddress.city')
        .notEmpty()
        .withMessage('City is required'),
];

module.exports = {
    createOrderValidator,
};
