/**
 * Site Settings Model
 * AURA ARCHIVE - System configuration (logo, contact, SEO, scripts)
 */

const { DEFAULT_PRODUCT_SIZE_GROUPS, flattenSizeGroups } = require('../utils/product-size-groups');

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
        {
            key: 'homepage_featured_brands',
            value: JSON.stringify([]),
            type: 'json',
            group: 'homepage',
            label: 'Thuong hieu noi bat trang chu',
            description: 'Danh sach thuong hieu hien thi o thanh brand trang chu. Chon tu cac brand dang co trong catalog.',
        },

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

        // Payment
        {
            key: 'payment_methods',
            value: JSON.stringify({
                cod: { enabled: true, label: 'Thanh toán khi nhận hàng (COD)' },
                bank_transfer: { enabled: true, label: 'Chuyển khoản ngân hàng' },
                momo: { enabled: true, label: 'MoMo' },
                vnpay: { enabled: true, label: 'VNPay' },
                paypal: { enabled: true, label: 'PayPal' },
                credit_card: { enabled: true, label: 'Visa / Mastercard / AMEX' },
            }),
            type: 'json',
            group: 'payment',
            label: 'Phương thức thanh toán',
        },
        {
            key: 'bank_accounts',
            value: JSON.stringify([]),
            type: 'json',
            group: 'payment',
            label: 'Tài khoản ngân hàng',
        },

        // Product Attributes - Dynamic options for product creation
        {
            key: 'product_brands',
            value: JSON.stringify([
                'Rick Owens', 'Acronym', 'Comme des Garçons', 'Ralph Lauren', 'Prada',
                'Balenciaga', 'Maison Margiela', 'Yohji Yamamoto', 'Fear of God', 'Off-White',
                'Gucci', 'Louis Vuitton', 'Chanel', 'Hermès', 'Dior'
            ]),
            type: 'json',
            group: 'product_attributes',
            label: 'Thương hiệu sản phẩm',
            description: 'Danh sách thương hiệu có thể chọn khi tạo sản phẩm'
        },
        {
            key: 'product_categories',
            value: JSON.stringify([
                { value: 'Tops', label_en: 'Tops', label_vi: 'Áo' },
                { value: 'Pants', label_en: 'Pants', label_vi: 'Quần' },
                { value: 'Outerwear', label_en: 'Outerwear', label_vi: 'Áo khoác' },
                { value: 'Shoes', label_en: 'Shoes', label_vi: 'Giày dép' },
                { value: 'Bags', label_en: 'Bags', label_vi: 'Túi xách' },
                { value: 'Accessories', label_en: 'Accessories', label_vi: 'Phụ kiện' },
                { value: 'Dresses', label_en: 'Dresses', label_vi: 'Váy đầm' },
                { value: 'Jewelry', label_en: 'Jewelry', label_vi: 'Trang sức' },
                { value: 'Watches', label_en: 'Watches', label_vi: 'Đồng hồ' }
            ]),
            type: 'json',
            group: 'product_attributes',
            label: 'Danh mục sản phẩm',
            description: 'Danh sách danh mục có thể chọn khi tạo sản phẩm'
        },
        {
            key: 'product_colors',
            value: JSON.stringify([
                { value: 'Black', label_en: 'Black', label_vi: 'Đen' },
                { value: 'White', label_en: 'White', label_vi: 'Trắng' },
                { value: 'Grey', label_en: 'Grey', label_vi: 'Xám' },
                { value: 'Navy', label_en: 'Navy', label_vi: 'Xanh navy' },
                { value: 'Olive', label_en: 'Olive', label_vi: 'Xanh ôliu' },
                { value: 'Burgundy', label_en: 'Burgundy', label_vi: 'Đỏ đô' },
                { value: 'Cream', label_en: 'Cream', label_vi: 'Kem' },
                { value: 'Brown', label_en: 'Brown', label_vi: 'Nâu' },
                { value: 'Multi', label_en: 'Multi', label_vi: 'Nhiều màu' },
                { value: 'Gold', label_en: 'Gold', label_vi: 'Vàng' },
                { value: 'Silver', label_en: 'Silver', label_vi: 'Bạc' }
            ]),
            type: 'json',
            group: 'product_attributes',
            label: 'Màu sắc sản phẩm',
            description: 'Danh sách màu sắc có thể chọn khi tạo sản phẩm'
        },
        {
            key: 'product_sizes',
            value: JSON.stringify(flattenSizeGroups(DEFAULT_PRODUCT_SIZE_GROUPS)),
            type: 'json',
            group: 'product_attributes',
            label: 'Kích cỡ sản phẩm',
            description: 'Danh sách kích cỡ có thể chọn khi tạo sản phẩm'
        },
        {
            key: 'product_size_groups',
            value: JSON.stringify(DEFAULT_PRODUCT_SIZE_GROUPS),
            type: 'json',
            group: 'product_attributes',
            label: 'Product size groups',
            description: 'Category-based size presets for apparel, pants, shoes, bags, and accessories'
        },
        {
            key: 'product_materials',
            value: JSON.stringify([
                { value: 'Leather', label_en: 'Leather', label_vi: 'Da' },
                { value: 'Cotton', label_en: 'Cotton', label_vi: 'Cotton' },
                { value: 'Wool', label_en: 'Wool', label_vi: 'Len' },
                { value: 'Nylon', label_en: 'Nylon', label_vi: 'Nylon' },
                { value: 'Silk', label_en: 'Silk', label_vi: 'Lụa' },
                { value: 'Cashmere', label_en: 'Cashmere', label_vi: 'Cashmere' },
                { value: 'Polyester', label_en: 'Polyester', label_vi: 'Polyester' },
                { value: 'Linen', label_en: 'Linen', label_vi: 'Lanh' },
                { value: 'Mixed', label_en: 'Mixed', label_vi: 'Hỗn hợp' },
                { value: 'Canvas', label_en: 'Canvas', label_vi: 'Vải canvas' },
                { value: 'Metal', label_en: 'Metal', label_vi: 'Kim loại' }
            ]),
            type: 'json',
            group: 'product_attributes',
            label: 'Chất liệu sản phẩm',
            description: 'Danh sách chất liệu có thể chọn khi tạo sản phẩm'
        },
    ];

    return SiteSettings;
};
