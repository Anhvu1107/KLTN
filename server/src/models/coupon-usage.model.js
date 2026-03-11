/**
 * Coupon Usage Model
 * AURA ARCHIVE - Track coupon usage per user
 */

module.exports = (sequelize, DataTypes) => {
    const CouponUsage = sequelize.define('CouponUsage', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        coupon_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'coupons',
                key: 'id',
            },
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        order_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'id',
            },
        },
        discount_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Actual discount applied',
        },
    }, {
        tableName: 'coupon_usages',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['coupon_id'] },
            { fields: ['user_id'] },
            { fields: ['order_id'] },
            { fields: ['coupon_id', 'user_id'] },
        ],
    });

    CouponUsage.associate = (models) => {
        CouponUsage.belongsTo(models.Coupon, {
            foreignKey: 'coupon_id',
            as: 'coupon',
        });
        CouponUsage.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
        CouponUsage.belongsTo(models.Order, {
            foreignKey: 'order_id',
            as: 'order',
        });
    };

    return CouponUsage;
};
