/**
 * Variant Controller
 * AURA ARCHIVE - Handle HTTP requests for variant management
 */

const variantService = require('../services/variant.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/admin/products/:productId/variants
 * Get all variants of a product
 */
const getVariants = catchAsync(async (req, res) => {
    const variants = await variantService.getVariantsByProductId(req.params.productId);

    res.status(200).json({
        success: true,
        data: { variants },
    });
});

/**
 * GET /api/v1/admin/variants/:id
 * Get single variant
 */
const getVariant = catchAsync(async (req, res) => {
    const variant = await variantService.getVariantById(req.params.id);

    res.status(200).json({
        success: true,
        data: { variant },
    });
});

/**
 * POST /api/v1/admin/products/:productId/variants
 * Create new variant for product
 */
const createVariant = catchAsync(async (req, res) => {
    const variant = await variantService.createVariant(req.params.productId, req.body);

    res.status(201).json({
        success: true,
        message: 'Variant created successfully',
        data: { variant },
    });
});

/**
 * PUT /api/v1/admin/variants/:id
 * Update variant
 */
const updateVariant = catchAsync(async (req, res) => {
    const variant = await variantService.updateVariant(req.params.id, req.body);

    res.status(200).json({
        success: true,
        message: 'Variant updated successfully',
        data: { variant },
    });
});

/**
 * DELETE /api/v1/admin/variants/:id
 * Delete variant
 */
const deleteVariant = catchAsync(async (req, res) => {
    const result = await variantService.deleteVariant(req.params.id);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

/**
 * PATCH /api/v1/admin/variants/:id/status
 * Update variant status
 */
const updateStatus = catchAsync(async (req, res) => {
    const { status } = req.body;
    const variant = await variantService.updateVariantStatus(req.params.id, status);

    res.status(200).json({
        success: true,
        message: `Variant status updated to ${status}`,
        data: { variant },
    });
});

module.exports = {
    getVariants,
    getVariant,
    createVariant,
    updateVariant,
    deleteVariant,
    updateStatus,
};
