/**
 * Coupon Assignment Model
 * AURA ARCHIVE - Assign PERSONAL coupons to specific users
 */

module.exports = (sequelize, DataTypes) => {
    const CouponAssignment = sequelize.define('CouponAssignment', {
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
        note: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Admin note (e.g. "Birthday gift", "VIP reward")',
        },
    }, {
        tableName: 'coupon_assignments',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['coupon_id'] },
            { fields: ['user_id'] },
            { unique: true, fields: ['coupon_id', 'user_id'] },
        ],
    });

    CouponAssignment.associate = (models) => {
        CouponAssignment.belongsTo(models.Coupon, {
            foreignKey: 'coupon_id',
            as: 'coupon',
        });
        CouponAssignment.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
    };

    return CouponAssignment;
};
