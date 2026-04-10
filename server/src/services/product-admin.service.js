/**
 * Admin Product Service
 * AURA ARCHIVE - Product management for admin
 */

const { Product, Variant, sequelize } = require('../models');
const AppError = require('../utils/AppError');
const { getDefaultSizeForCategory } = require('../utils/product-size-groups');

/**
 * Create product with variant (unique item model)
 */
const createProduct = async (productData, variantData) => {
    const transaction = await sequelize.transaction();

    try {
        // Generate slug
        const slug = `${productData.brand}-${productData.name}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            + `-${Date.now()}`;

        // Generate SKU
        const brandCode = productData.brand.substring(0, 3).toUpperCase().replace(/\s/g, '');
        const sku = `${brandCode}-${Date.now().toString().slice(-8)}`;

        // Create product
        const product = await Product.create({
            name: productData.name,
            slug,
            brand: productData.brand,
            description: productData.description || '',
            base_price: productData.base_price,
            sale_price: productData.sale_price || null,
            category: productData.category,
            subcategory: productData.subcategory || 'Unisex',
            condition_text: productData.condition_text,
            condition_description: productData.condition_description || '',
            authenticity_verified: true,
            images: productData.images || JSON.stringify([]),
            tags: productData.tags || JSON.stringify([productData.brand.toLowerCase()]),
            is_active: true,
            is_new_arrival: productData.is_new_arrival || false,
        }, { transaction });

        // Create variant
        await Variant.create({
            product_id: product.id,
            sku,
            size: variantData.size || getDefaultSizeForCategory(productData.category),
            color: variantData.color || 'N/A',
            material: variantData.material || '',
            price_adjustment: 0,
            status: 'AVAILABLE',
        }, { transaction });

        await transaction.commit();

        // Return product with variant
        const result = await Product.findByPk(product.id, {
            include: [{ model: Variant, as: 'variants' }],
        });

        return result;

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Get all products for admin (with all statuses)
 */
const getAllProducts = async (options = {}) => {
    const { page = 1, limit = 20, status, search } = options;
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
        const { Op } = require('sequelize');
        where[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { brand: { [Op.iLike]: `%${search}%` } },
        ];
    }

    const { count, rows } = await Product.findAndCountAll({
        where,
        include: [{
            model: Variant,
            as: 'variants',
            where: status ? { status } : undefined,
            required: status ? true : false,
        }],
        order: [['created_at', 'DESC']],
        limit,
        offset,
        distinct: true,
    });

    return {
        products: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};

/**
 * Update product
 */
const updateProduct = async (productId, data) => {
    const product = await Product.findByPk(productId);

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    await product.update(data);

    return product;
};

/**
 * Delete product (soft delete)
 */
const deleteProduct = async (productId) => {
    const product = await Product.findByPk(productId);

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    // Delete variants first (foreign key)
    await Variant.destroy({ where: { product_id: productId } });

    // Hard delete the product
    await product.destroy();

    return { message: 'Product deleted permanently' };
};

module.exports = {
    createProduct,
    getAllProducts,
    updateProduct,
    deleteProduct,
};
