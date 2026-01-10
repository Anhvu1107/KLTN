/**
 * Site Settings Service
 * AURA ARCHIVE - Manage site configuration
 */

const { SiteSettings } = require('../models');

/**
 * Get all settings
 */
const getAllSettings = async () => {
    const settings = await SiteSettings.findAll({
        order: [['group', 'ASC'], ['key', 'ASC']],
    });

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
        if (!acc[setting.group]) acc[setting.group] = [];
        acc[setting.group].push(setting);
        return acc;
    }, {});

    return grouped;
};

/**
 * Get setting by key
 */
const getSetting = async (key) => {
    const setting = await SiteSettings.findOne({ where: { key } });
    return setting?.value || null;
};

/**
 * Get multiple settings as object
 */
const getSettings = async (keys) => {
    const settings = await SiteSettings.findAll({
        where: { key: keys },
    });

    return settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
    }, {});
};

/**
 * Get public settings (for frontend)
 */
const getPublicSettings = async () => {
    const publicKeys = [
        'site_name', 'site_tagline', 'site_logo', 'site_favicon',
        'contact_phone', 'contact_email', 'contact_address',
        'social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube',
        'seo_title', 'seo_description', 'seo_keywords',
        'google_analytics', 'facebook_pixel',
    ];

    return getSettings(publicKeys);
};

/**
 * Update setting
 */
const updateSetting = async (key, value) => {
    const [setting, created] = await SiteSettings.upsert({
        key,
        value,
    });
    return setting;
};

/**
 * Bulk update settings
 */
const bulkUpdateSettings = async (updates) => {
    const results = [];
    for (const { key, value } of updates) {
        const result = await updateSetting(key, value);
        results.push(result);
    }
    return results;
};

/**
 * Seed default settings
 */
const seedDefaultSettings = async () => {
    for (const setting of SiteSettings.defaultSettings) {
        await SiteSettings.findOrCreate({
            where: { key: setting.key },
            defaults: setting,
        });
    }
};

module.exports = {
    getAllSettings,
    getSetting,
    getSettings,
    getPublicSettings,
    updateSetting,
    bulkUpdateSettings,
    seedDefaultSettings,
};
