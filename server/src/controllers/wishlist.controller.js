/**
 * Wishlist Controller
 * AURA ARCHIVE - Handle wishlist HTTP requests
 */

const wishlistService = require('../services/wishlist.service');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/v1/wishlist
 * Add product to wishlist
 */
const addToWishlist = catchAsync(async (req, res) => {
    const { productId } = req.body;
    const userId = req.user.id;

    if (!productId) {
        return res.status(400).json({
            success: false,
            message: 'Product ID is required',
        });
    }

    const result = await wishlistService.addToWishlist(userId, productId);

    res.status(200).json({
        success: true,
        ...result,
    });
});

/**
 * DELETE /api/v1/wishlist/:productId
 * Remove product from wishlist
 */
const removeFromWishlist = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user.id;

    const result = await wishlistService.removeFromWishlist(userId, productId);

    res.status(200).json({
        success: true,
        ...result,
    });
});

/**
 * GET /api/v1/wishlist
 * Get user's wishlist
 */
const getWishlist = catchAsync(async (req, res) => {
    const userId = req.user.id;

    const items = await wishlistService.getWishlist(userId);

    res.status(200).json({
        success: true,
        data: { items, count: items.length },
    });
});

/**
 * GET /api/v1/wishlist/check/:productId
 * Check if product is in wishlist
 */
const checkWishlist = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user.id;

    const inWishlist = await wishlistService.isInWishlist(userId, productId);

    res.status(200).json({
        success: true,
        data: { inWishlist },
    });
});

module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    checkWishlist,
};
