/**
 * Site Settings Controller
 * AURA ARCHIVE - API for site configuration
 */

const siteSettingsService = require('../services/site-settings.service');
const catchAsync = require('../utils/catchAsync');
const { SiteSettings } = require('../models');
const {
    DEFAULT_PRODUCT_SIZE_GROUPS,
    normalizeSizeGroups,
    flattenSizeGroups,
    applyLegacySizesFallback,
} = require('../utils/product-size-groups');

const getDefaultSettingValue = (key, fallback) => {
    const defaultSetting = SiteSettings.defaultSettings?.find((setting) => setting.key === key);

    if (!defaultSetting?.value) {
        return fallback;
    }

    try {
        return JSON.parse(defaultSetting.value);
    } catch {
        return fallback;
    }
};

const parseSettingValue = (setting, fallback) => {
    if (!setting?.value) {
        return fallback;
    }

    try {
        return JSON.parse(setting.value);
    } catch {
        return fallback;
    }
};

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
    await siteSettingsService.seedDefaultSettings();
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
    const [
        brandsSetting,
        categoriesSetting,
        colorsSetting,
        legacySizesSetting,
        sizeGroupsSetting,
        materialsSetting,
    ] = await Promise.all([
        siteSettingsService.getSettingByKey('product_brands'),
        siteSettingsService.getSettingByKey('product_categories'),
        siteSettingsService.getSettingByKey('product_colors'),
        siteSettingsService.getSettingByKey('product_sizes'),
        siteSettingsService.getSettingByKey('product_size_groups'),
        siteSettingsService.getSettingByKey('product_materials'),
    ]);

    const categories = parseSettingValue(
        categoriesSetting,
        getDefaultSettingValue('product_categories', [])
    );

    const legacySizes = parseSettingValue(
        legacySizesSetting,
        getDefaultSettingValue('product_sizes', flattenSizeGroups(DEFAULT_PRODUCT_SIZE_GROUPS))
    );

    const rawSizeGroups = parseSettingValue(sizeGroupsSetting, DEFAULT_PRODUCT_SIZE_GROUPS);
    const sizeGroups = sizeGroupsSetting?.value
        ? normalizeSizeGroups(rawSizeGroups, categories)
        : normalizeSizeGroups(applyLegacySizesFallback(rawSizeGroups, legacySizes), categories);

    const attributes = {
        brands: parseSettingValue(
            brandsSetting,
            getDefaultSettingValue('product_brands', [])
        ),
        categories,
        colors: parseSettingValue(
            colorsSetting,
            getDefaultSettingValue('product_colors', [])
        ),
        sizes: flattenSizeGroups(sizeGroups),
        size_groups: sizeGroups,
        materials: parseSettingValue(
            materialsSetting,
            getDefaultSettingValue('product_materials', [])
        ),
    };

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
    const validKeys = ['product_brands', 'product_categories', 'product_colors', 'product_sizes', 'product_size_groups', 'product_materials'];
    const fullKey = key.startsWith('product_') ? key : `product_${key}`;
    const expectsObject = fullKey === 'product_size_groups';

    if (!validKeys.includes(fullKey)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid attribute key',
        });
    }

    if (expectsObject) {
        if (!items || typeof items !== 'object' || Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Items must be an object of size groups',
            });
        }
    } else if (!Array.isArray(items)) {
        return res.status(400).json({
            success: false,
            message: 'Items must be an array',
        });
    }

    if (expectsObject) {
        const categoriesSetting = await siteSettingsService.getSettingByKey('product_categories');
        const categories = parseSettingValue(
            categoriesSetting,
            getDefaultSettingValue('product_categories', [])
        );
        const normalizedGroups = normalizeSizeGroups(items, categories);

        await siteSettingsService.updateSetting(fullKey, JSON.stringify(normalizedGroups));
        await siteSettingsService.updateSetting('product_sizes', JSON.stringify(flattenSizeGroups(normalizedGroups)));

        return res.status(200).json({
            success: true,
            message: 'Product attribute updated successfully',
            data: {
                [key]: normalizedGroups,
                sizes: flattenSizeGroups(normalizedGroups),
            }
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
