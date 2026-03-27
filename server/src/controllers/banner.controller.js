/**
 * Banner Controller
 * AURA ARCHIVE - Banner API handlers
 */

const bannerService = require('../services/banner.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/banners
 * Get active banners for homepage
 */
const getActiveBanners = catchAsync(async (req, res) => {
    const { section } = req.query;
    const banners = await bannerService.getActiveBanners(section || null);

    res.status(200).json({
        success: true,
        data: { banners },
    });
});

/**
 * GET /api/v1/admin/banners
 * Get all banners (admin)
 */
const getAllBanners = catchAsync(async (req, res) => {
    const banners = await bannerService.getAllBanners();

    res.status(200).json({
        success: true,
        data: { banners },
    });
});

/**
 * POST /api/v1/admin/banners
 * Create banner (admin)
 */
const createBanner = catchAsync(async (req, res) => {
    const banner = await bannerService.createBanner(req.body);

    res.status(201).json({
        success: true,
        message: 'Banner created',
        data: { banner },
    });
});

/**
 * PUT /api/v1/admin/banners/:id
 * Update banner (admin)
 */
const updateBanner = catchAsync(async (req, res) => {
    const banner = await bannerService.updateBanner(req.params.id, req.body);

    res.status(200).json({
        success: true,
        message: 'Banner updated',
        data: { banner },
    });
});

/**
 * DELETE /api/v1/admin/banners/:id
 * Delete banner (admin)
 */
const deleteBanner = catchAsync(async (req, res) => {
    await bannerService.deleteBanner(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Banner deleted',
    });
});

module.exports = {
    getActiveBanners,
    getAllBanners,
    createBanner,
    updateBanner,
    deleteBanner,
};
