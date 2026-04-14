/**
 * Abandoned Cart Controller
 * AURA ARCHIVE - Customer cart recovery endpoints
 */

const abandonedCartService = require('../services/abandoned-cart.service');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/v1/abandoned-carts/track
 * Save the latest cart snapshot for the logged-in customer
 */
const trackAbandonedCart = catchAsync(async (req, res) => {
    const { items, totalAmount, email, phone } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Cart items are required',
        });
    }

    const cart = await abandonedCartService.upsertAbandonedCart({
        user_id: req.user.id,
        email: email || req.user.email || null,
        phone: phone || null,
        items,
        total_amount: totalAmount || 0,
    });

    res.status(200).json({
        success: true,
        data: { cart },
    });
});

/**
 * POST /api/v1/abandoned-carts/recover-current
 * Mark the latest active cart as recovered when the user comes back
 */
const recoverCurrentCart = catchAsync(async (req, res) => {
    const cart = await abandonedCartService.markLatestCartAsRecovered(req.user.id);

    res.status(200).json({
        success: true,
        data: { cart },
    });
});

module.exports = {
    trackAbandonedCart,
    recoverCurrentCart,
};
