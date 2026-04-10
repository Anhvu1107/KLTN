/**
 * Variant Service
 * AURA ARCHIVE - CRUD operations for product variants
 */

const { Variant, Product } = require('../models');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');
const { getDefaultSizeForCategory } = require('../utils/product-size-groups');

/**
 * Get all variants for a product
 */
const getVariantsByProductId = async (productId) => {
    const variants = await Variant.findAll({
        where: { product_id: productId },
        order: [['created_at', 'ASC']],
    });
    return variants;
};

/**
 * Get single variant by ID
 */
const getVariantById = async (variantId) => {
    const variant = await Variant.findByPk(variantId);
    if (!variant) {
        throw new AppError('Variant not found', 404);
    }
    return variant;
};

/**
 * Create new variant for a product
 */
const createVariant = async (productId, variantData) => {
    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
        throw new AppError('Product not found', 404);
    }

    // Generate SKU if not provided
    const sku = variantData.sku || `${product.brand.substring(0, 3).toUpperCase()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const variant = await Variant.create({
        product_id: productId,
        sku,
        size: variantData.size || getDefaultSizeForCategory(product.category),
        color: variantData.color || 'Default',
        material: variantData.material || null,
        price_adjustment: variantData.price_adjustment || 0,
        status: variantData.status || 'AVAILABLE',
    });

    return variant;
};

/**
 * Update variant
 */
const updateVariant = async (variantId, updateData) => {
    const variant = await Variant.findByPk(variantId);
    if (!variant) {
        throw new AppError('Variant not found', 404);
    }

    // Only allow updating certain fields
    const allowedFields = ['size', 'color', 'material', 'price_adjustment', 'status'];
    const filteredData = {};

    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            filteredData[field] = updateData[field];
        }
    }

    await variant.update(filteredData);
    return variant;
};

/**
 * Delete variant
 */
const deleteVariant = async (variantId) => {
    const variant = await Variant.findByPk(variantId);
    if (!variant) {
        throw new AppError('Variant not found', 404);
    }

    // Check if variant is sold - cannot delete sold items
    if (variant.status === 'SOLD') {
        throw new AppError('Cannot delete a sold variant', 400);
    }

    await variant.destroy();
    return { message: 'Variant deleted successfully' };
};

/**
 * Update variant status
 */
const updateVariantStatus = async (variantId, status) => {
    const validStatuses = ['AVAILABLE', 'RESERVED', 'SOLD'];
    if (!validStatuses.includes(status)) {
        throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const variant = await Variant.findByPk(variantId);
    if (!variant) {
        throw new AppError('Variant not found', 404);
    }

    await variant.update({ status });
    return variant;
};

module.exports = {
    getVariantsByProductId,
    getVariantById,
    createVariant,
    updateVariant,
    deleteVariant,
    updateVariantStatus,
};
