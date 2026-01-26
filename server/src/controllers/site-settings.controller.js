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

/**
 * GET /api/v1/settings/product-attributes
 * Get product attributes for product form (public)
 */
const getProductAttributes = catchAsync(async (req, res) => {
    const attributeKeys = [
        'product_brands',
        'product_categories',
        'product_colors',
        'product_sizes',
        'product_materials'
    ];

    const attributes = {};

    for (const key of attributeKeys) {
        const setting = await siteSettingsService.getSettingByKey(key);
        if (setting && setting.value) {
            try {
                // Parse JSON value
                attributes[key.replace('product_', '')] = JSON.parse(setting.value);
            } catch (e) {
                attributes[key.replace('product_', '')] = [];
            }
        } else {
            attributes[key.replace('product_', '')] = [];
        }
    }

    res.status(200).json({
        success: true,
        data: { attributes },
    });
});

/**
 * PUT /api/v1/admin/product-attributes/:key
 * Update a specific product attribute (admin)
 * Body: { items: [...] } - array of items to save
 */
const updateProductAttribute = catchAsync(async (req, res) => {
    const { key } = req.params;
    const { items } = req.body;

    // Validate key
    const validKeys = ['product_brands', 'product_categories', 'product_colors', 'product_sizes', 'product_materials'];
    const fullKey = key.startsWith('product_') ? key : `product_${key}`;

    if (!validKeys.includes(fullKey)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid attribute key',
        });
    }

    if (!Array.isArray(items)) {
        return res.status(400).json({
            success: false,
            message: 'Items must be an array',
        });
    }

    await siteSettingsService.updateSetting(fullKey, JSON.stringify(items));

    res.status(200).json({
        success: true,
        message: 'Product attribute updated successfully',
        data: { [key]: items }
    });
});

module.exports = {
    getPublicSettings,
    getAllSettings,
    updateSettings,
    seedSettings,
    getProductAttributes,
    updateProductAttribute,
};
