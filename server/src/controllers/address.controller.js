/**
 * Address Controller
 * AURA ARCHIVE - Handle HTTP requests for user addresses
 */

const addressService = require('../services/address.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/addresses
 * Get all addresses for current user
 */
const getAddresses = catchAsync(async (req, res) => {
    const addresses = await addressService.getUserAddresses(req.user.id);

    res.status(200).json({
        success: true,
        data: { addresses },
    });
});

/**
 * GET /api/v1/addresses/:id
 * Get address by ID
 */
const getAddressById = catchAsync(async (req, res) => {
    const address = await addressService.getAddressById(req.user.id, req.params.id);

    res.status(200).json({
        success: true,
        data: { address },
    });
});

/**
 * GET /api/v1/addresses/default
 * Get default address
 */
const getDefaultAddress = catchAsync(async (req, res) => {
    const address = await addressService.getDefaultAddress(req.user.id);

    res.status(200).json({
        success: true,
        data: { address },
    });
});

/**
 * POST /api/v1/addresses
 * Create new address
 */
const createAddress = catchAsync(async (req, res) => {
    const address = await addressService.createAddress(req.user.id, req.body);

    res.status(201).json({
        success: true,
        message: 'Address created successfully',
        data: { address },
    });
});

/**
 * PUT /api/v1/addresses/:id
 * Update address
 */
const updateAddress = catchAsync(async (req, res) => {
    const address = await addressService.updateAddress(req.user.id, req.params.id, req.body);

    res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: { address },
    });
});

/**
 * DELETE /api/v1/addresses/:id
 * Delete address
 */
const deleteAddress = catchAsync(async (req, res) => {
    await addressService.deleteAddress(req.user.id, req.params.id);

    res.status(200).json({
        success: true,
        message: 'Address deleted successfully',
    });
});

/**
 * PATCH /api/v1/addresses/:id/default
 * Set address as default
 */
const setDefaultAddress = catchAsync(async (req, res) => {
    const address = await addressService.setDefaultAddress(req.user.id, req.params.id);

    res.status(200).json({
        success: true,
        message: 'Default address updated',
        data: { address },
    });
});

module.exports = {
    getAddresses,
    getAddressById,
    getDefaultAddress,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
};
