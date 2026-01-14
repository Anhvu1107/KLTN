/**
 * Admin Validator
 * AURA ARCHIVE - Request validation for admin endpoints
 */

const { body, param } = require('express-validator');

// =============================================
// PRODUCT VALIDATORS
// =============================================

const createProductValidator = [
    body('product.name')
        .notEmpty()
        .withMessage('Product name is required')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Product name must be between 2 and 255 characters'),
    body('product.brand')
        .notEmpty()
        .withMessage('Brand is required')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Brand must be between 1 and 100 characters'),
    body('product.category')
        .notEmpty()
        .withMessage('Category is required')
        .isIn(['Tops', 'Pants', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Dresses', 'Jewelry', 'Watches', 'Clothing'])
        .withMessage('Invalid category'),
    body('product.base_price')
        .notEmpty()
        .withMessage('Base price is required')
        .isFloat({ min: 0 })
        .withMessage('Base price must be a positive number'),
    body('product.sale_price')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Sale price must be a positive number'),
    body('product.description')
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage('Description must be less than 5000 characters'),
    body('product.condition_text')
        .optional()
        .isIn(['10/10 - New with tags', '9/10 - Like New', '8/10 - Excellent', '7/10 - Good', 'Vintage', 'New with Tags', 'Excellent', 'Very Good', 'Good'])
        .withMessage('Invalid condition'),
    body('variant.size')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Size must be less than 20 characters'),
    body('variant.color')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Color must be less than 50 characters'),
];

const updateProductValidator = [
    param('id')
        .isUUID()
        .withMessage('Invalid product ID'),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Product name must be between 2 and 255 characters'),
    body('brand')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Brand must be between 1 and 100 characters'),
    body('base_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Base price must be a positive number'),
    body('sale_price')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('Sale price must be a positive number'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),
];

// =============================================
// BANNER VALIDATORS
// =============================================

const createBannerValidator = [
    body('title')
        .notEmpty()
        .withMessage('Banner title is required')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Title must be between 1 and 255 characters'),
    body('image_url')
        .notEmpty()
        .withMessage('Image URL is required')
        .isURL()
        .withMessage('Invalid image URL format'),
    body('link_url')
        .optional()
        .trim(),
    body('button_text')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Button text must be less than 50 characters'),
    body('position')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Position must be a non-negative integer'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),
];

const updateBannerValidator = [
    param('id')
        .isUUID()
        .withMessage('Invalid banner ID'),
    body('title')
        .optional()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Title must be between 1 and 255 characters'),
    body('image_url')
        .optional()
        .isURL()
        .withMessage('Invalid image URL format'),
    body('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),
];

// =============================================
// VARIANT VALIDATORS
// =============================================

const createVariantValidator = [
    param('productId')
        .isUUID()
        .withMessage('Invalid product ID'),
    body('size')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Size must be less than 20 characters'),
    body('color')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Color must be less than 50 characters'),
    body('material')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Material must be less than 100 characters'),
    body('status')
        .optional()
        .isIn(['AVAILABLE', 'RESERVED', 'SOLD'])
        .withMessage('Invalid status'),
];

const updateVariantValidator = [
    param('id')
        .notEmpty()
        .withMessage('Variant ID is required'),
    body('size')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Size must be less than 20 characters'),
    body('color')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Color must be less than 50 characters'),
    body('status')
        .optional()
        .isIn(['AVAILABLE', 'RESERVED', 'SOLD'])
        .withMessage('Invalid status'),
];

// =============================================
// ORDER VALIDATORS
// =============================================

const updateOrderStatusValidator = [
    param('id')
        .isUUID()
        .withMessage('Invalid order ID'),
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
        .withMessage('Invalid order status'),
];

module.exports = {
    // Product
    createProductValidator,
    updateProductValidator,
    // Banner
    createBannerValidator,
    updateBannerValidator,
    // Variant
    createVariantValidator,
    updateVariantValidator,
    // Order
    updateOrderStatusValidator,
};
