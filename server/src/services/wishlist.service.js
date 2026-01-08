/**
 * Wishlist Service
 * AURA ARCHIVE - User wishlist/favorites logic
 */

const { Wishlist, Product, Variant } = require('../models');
const AppError = require('../utils/AppError');

/**
 * Add product to wishlist
 */
const addToWishlist = async (userId, productId) => {
    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
        throw new AppError('Product not found', 404);
    }

    // Check if already in wishlist
    const existing = await Wishlist.findOne({
        where: { user_id: userId, product_id: productId },
    });

    if (existing) {
        return { added: false, message: 'Product already in wishlist' };
    }

    await Wishlist.create({
        user_id: userId,
        product_id: productId,
    });

    return { added: true, message: 'Product added to wishlist' };
};

/**
 * Remove product from wishlist
 */
const removeFromWishlist = async (userId, productId) => {
    const deleted = await Wishlist.destroy({
        where: { user_id: userId, product_id: productId },
    });

    if (!deleted) {
        throw new AppError('Product not found in wishlist', 404);
    }

    return { removed: true, message: 'Product removed from wishlist' };
};

/**
 * Get user's wishlist
 */
const getWishlist = async (userId) => {
    const items = await Wishlist.findAll({
        where: { user_id: userId },
        include: [{
            model: Product,
            as: 'product',
            include: [{
                model: Variant,
                as: 'variants',
            }],
        }],
        order: [['created_at', 'DESC']],
    });

    return items;
};

/**
 * Check if product is in wishlist
 */
const isInWishlist = async (userId, productId) => {
    const item = await Wishlist.findOne({
        where: { user_id: userId, product_id: productId },
    });

    return !!item;
};

/**
 * Get wishlist count for user
 */
const getWishlistCount = async (userId) => {
    const count = await Wishlist.count({
        where: { user_id: userId },
    });

    return count;
};

/**
 * Get product wishlist count (for admin stats)
 */
const getProductWishlistCount = async (productId) => {
    const count = await Wishlist.count({
        where: { product_id: productId },
    });

    return count;
};

/**
 * Get most wishlisted products
 */
const getMostWishlisted = async (limit = 10) => {
    const { fn, col, literal } = require('sequelize');

    const products = await Product.findAll({
        include: [{
            model: Wishlist,
            as: 'wishlists',
            attributes: [],
        }, {
            model: Variant,
            as: 'variants',
        }],
        attributes: {
            include: [
                [fn('COUNT', col('wishlists.id')), 'wishlist_count'],
            ],
        },
        group: ['Product.id', 'variants.id'],
        order: [[literal('wishlist_count'), 'DESC']],
        limit,
        subQuery: false,
    });

    return products;
};

module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    isInWishlist,
    getWishlistCount,
    getProductWishlistCount,
    getMostWishlisted,
};
