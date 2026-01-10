/**
 * Site Settings Model
 * AURA ARCHIVE - System configuration (logo, contact, SEO, scripts)
 */

module.exports = (sequelize, DataTypes) => {
    const SiteSettings = sequelize.define('SiteSettings', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        key: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        type: {
            type: DataTypes.ENUM('text', 'textarea', 'image', 'json', 'boolean'),
            defaultValue: 'text',
        },
        group: {
            type: DataTypes.STRING(50),
            defaultValue: 'general',
            comment: 'Group for organizing settings in admin',
        },
        label: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Human-readable label for admin UI',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: 'site_settings',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['key'] },
            { fields: ['group'] },
        ],
    });

    // Default settings to seed
    SiteSettings.defaultSettings = [
        // General
        { key: 'site_name', value: 'AURA ARCHIVE', type: 'text', group: 'general', label: 'Tên website' },
        { key: 'site_tagline', value: 'Luxury Resell Fashion', type: 'text', group: 'general', label: 'Slogan' },
        { key: 'site_logo', value: '', type: 'image', group: 'general', label: 'Logo' },
        { key: 'site_favicon', value: '', type: 'image', group: 'general', label: 'Favicon' },

        // Contact
        { key: 'contact_phone', value: '0123 456 789', type: 'text', group: 'contact', label: 'Hotline' },
        { key: 'contact_email', value: 'support@aura-archive.com', type: 'text', group: 'contact', label: 'Email hỗ trợ' },
        { key: 'contact_address', value: '123 Nguyễn Huệ, Quận 1, TP.HCM', type: 'textarea', group: 'contact', label: 'Địa chỉ' },

        // Social
        { key: 'social_facebook', value: '', type: 'text', group: 'social', label: 'Facebook URL' },
        { key: 'social_instagram', value: '', type: 'text', group: 'social', label: 'Instagram URL' },
        { key: 'social_tiktok', value: '', type: 'text', group: 'social', label: 'TikTok URL' },
        { key: 'social_youtube', value: '', type: 'text', group: 'social', label: 'YouTube URL' },

        // SEO
        { key: 'seo_title', value: 'AURA ARCHIVE | Luxury Resell Fashion', type: 'text', group: 'seo', label: 'SEO Title' },
        { key: 'seo_description', value: 'Khám phá thời trang cao cấp đã qua sử dụng. Sản phẩm designer chính hãng.', type: 'textarea', group: 'seo', label: 'SEO Description' },
        { key: 'seo_keywords', value: 'luxury fashion, designer bags, second hand luxury', type: 'text', group: 'seo', label: 'SEO Keywords' },

        // Scripts
        { key: 'script_head', value: '', type: 'textarea', group: 'scripts', label: 'Script trong <head>' },
        { key: 'script_body', value: '', type: 'textarea', group: 'scripts', label: 'Script trong <body>' },
        { key: 'google_analytics', value: '', type: 'text', group: 'scripts', label: 'Google Analytics ID' },
        { key: 'facebook_pixel', value: '', type: 'text', group: 'scripts', label: 'Facebook Pixel ID' },
    ];

    return SiteSettings;
};
