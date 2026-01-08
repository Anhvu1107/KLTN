/**
 * Product Service
 * AURA ARCHIVE - Business logic for products
 */

const { Product, Variant, sequelize } = require('../models');
const AppError = require('../utils/AppError');
const { Op } = require('sequelize');

/**
 * Get all products with filters
 */
const getProducts = async (options = {}) => {
    const {
        page = 1,
        limit = 12,
        category,
        brand,
        minPrice,
        maxPrice,
        status,
        sort = 'newest',
        search,
    } = options;

    const offset = (page - 1) * limit;

    // Build where clause for products
    const productWhere = { is_active: true };

    if (category) {
        productWhere.category = category;
    }

    if (brand) {
        productWhere.brand = { [Op.iLike]: `%${brand}%` };
    }

    if (search) {
        productWhere[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { brand: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } },
        ];
    }

    if (minPrice) {
        productWhere.base_price = { ...productWhere.base_price, [Op.gte]: minPrice };
    }

    if (maxPrice) {
        productWhere.base_price = { ...productWhere.base_price, [Op.lte]: maxPrice };
    }

    // Build where clause for variants
    const variantWhere = {};
    if (status) {
        variantWhere.status = status;
    }

    // Sort order
    let order;
    switch (sort) {
        case 'price-asc':
            order = [['base_price', 'ASC']];
            break;
        case 'price-desc':
            order = [['base_price', 'DESC']];
            break;
        case 'oldest':
            order = [['created_at', 'ASC']];
            break;
        case 'popular':
            order = [['view_count', 'DESC']];
            break;
        case 'newest':
        default:
            order = [['created_at', 'DESC']];
    }

    const { count, rows } = await Product.findAndCountAll({
        where: productWhere,
        include: [{
            model: Variant,
            as: 'variants',
            where: Object.keys(variantWhere).length > 0 ? variantWhere : undefined,
            required: Object.keys(variantWhere).length > 0,
        }],
        order,
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
 * Get product by ID or slug
 */
const getProductByIdOrSlug = async (identifier) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    const where = isUUID ? { id: identifier } : { slug: identifier };
    where.is_active = true;

    const product = await Product.findOne({
        where,
        include: [{
            model: Variant,
            as: 'variants',
        }],
    });

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    // Increment view count
    await product.increment('view_count');

    return product;
};

/**
 * Get featured products
 */
const getFeaturedProducts = async (limit = 8) => {
    const products = await Product.findAll({
        where: { is_active: true, is_featured: true },
        include: [{
            model: Variant,
            as: 'variants',
            where: { status: 'AVAILABLE' },
            required: true,
        }],
        order: [['created_at', 'DESC']],
        limit,
    });

    return products;
};

/**
 * Get product categories with counts
 */
const getCategories = async () => {
    const categories = await Product.findAll({
        attributes: [
            'category',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: { is_active: true },
        group: ['category'],
        raw: true,
    });

    return categories;
};

/**
 * Get unique brands
 */
const getBrands = async () => {
    const brands = await Product.findAll({
        attributes: [
            'brand',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: { is_active: true },
        group: ['brand'],
        order: [['brand', 'ASC']],
        raw: true,
    });

    return brands;
};

module.exports = {
    getProducts,
    getProductByIdOrSlug,
    getFeaturedProducts,
    getCategories,
    getBrands,
};
