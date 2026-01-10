/**
 * Site Settings Controller
 * AURA ARCHIVE - API for site configuration
 */

const siteSettingsService = require('../services/site-settings.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/settings
 * Get public settings
 */
const getPublicSettings = catchAsync(async (req, res) => {
    const settings = await siteSettingsService.getPublicSettings();

    res.status(200).json({
        success: true,
        data: { settings },
    });
});

/**
 * GET /api/v1/admin/settings
 * Get all settings (admin)
 */
const getAllSettings = catchAsync(async (req, res) => {
    const settings = await siteSettingsService.getAllSettings();

    res.status(200).json({
        success: true,
        data: { settings },
    });
});

/**
 * PUT /api/v1/admin/settings
 * Update settings (admin)
 */
const updateSettings = catchAsync(async (req, res) => {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
        return res.status(400).json({
            success: false,
            message: 'Settings must be an array',
        });
    }

    await siteSettingsService.bulkUpdateSettings(settings);

    res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
    });
});

/**
 * POST /api/v1/admin/settings/seed
 * Seed default settings
 */
const seedSettings = catchAsync(async (req, res) => {
    await siteSettingsService.seedDefaultSettings();

    res.status(200).json({
        success: true,
        message: 'Default settings seeded',
    });
});

module.exports = {
    getPublicSettings,
    getAllSettings,
    updateSettings,
    seedSettings,
};
