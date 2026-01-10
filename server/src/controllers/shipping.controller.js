/**
 * Shipping Controller
 * AURA ARCHIVE - Shipping fee calculation API
 */

const shippingService = require('../services/shipping.service');
const catchAsync = require('../utils/catchAsync');

/**
 * POST /api/v1/shipping/calculate
 * Calculate shipping fee
 */
const calculateShipping = catchAsync(async (req, res) => {
    const { province, district, orderAmount } = req.body;

    if (!province) {
        return res.status(400).json({
            success: false,
            message: 'Province is required',
        });
    }

    const options = shippingService.getShippingOptions(province, district, orderAmount || 0);
    const freeThreshold = shippingService.getFreeShippingThreshold();

    res.status(200).json({
        success: true,
        data: {
            options,
            freeShippingThreshold: freeThreshold,
            freeShippingMessage: `Miễn phí vận chuyển cho đơn hàng từ ${(freeThreshold / 1000).toLocaleString()}k`,
        },
    });
});

/**
 * GET /api/v1/shipping/rates
 * Get shipping rates info
 */
const getShippingRates = catchAsync(async (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            rates: shippingService.SHIPPING_RATES,
            freeThreshold: shippingService.getFreeShippingThreshold(),
        },
    });
});

module.exports = {
    calculateShipping,
    getShippingRates,
};
