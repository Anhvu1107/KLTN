/**
 * Coupon Model
 * AURA ARCHIVE - Discount Codes & Vouchers
 */

module.exports = (sequelize, DataTypes) => {
    const Coupon = sequelize.define('Coupon', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Unique coupon code',
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Display name for admin',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        type: {
            type: DataTypes.ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'),
            allowNull: false,
            comment: 'PERCENTAGE = % off, FIXED_AMOUNT = $ off, FREE_SHIPPING = shipping discount',
        },
        value: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Discount value (% or fixed amount). FREE_SHIPPING uses 0.',
        },
        min_order_amount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            comment: 'Minimum order amount to apply coupon',
        },
        max_discount_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            comment: 'Maximum discount amount (for percentage coupons)',
        },
        max_uses: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Total max uses (null = unlimited)',
        },
        max_uses_per_user: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: 'Max uses per user',
        },
        uses_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Current usage count',
        },
        starts_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Coupon valid from',
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Coupon valid until',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        applies_to: {
            type: DataTypes.ENUM('ALL', 'SPECIFIC_PRODUCTS', 'SPECIFIC_CATEGORIES'),
            defaultValue: 'ALL',
        },
        product_ids: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Array of product IDs if applies_to is SPECIFIC_PRODUCTS',
        },
        category_ids: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Array of category names if applies_to is SPECIFIC_CATEGORIES',
        },
        visibility: {
            type: DataTypes.ENUM('PUBLIC', 'PRIVATE', 'PERSONAL'),
            defaultValue: 'PUBLIC',
            comment: 'PUBLIC = everyone, PRIVATE = admin-only (VVIP), PERSONAL = assigned users only',
        },
    }, {
        tableName: 'coupons',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['code'] },
            { fields: ['is_active'] },
            { fields: ['expires_at'] },
            { fields: ['visibility'] },
        ],
    });

    Coupon.associate = (models) => {
        Coupon.hasMany(models.CouponAssignment, {
            foreignKey: 'coupon_id',
            as: 'assignments',
        });
    };

    return Coupon;
};
