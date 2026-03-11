/**
 * Variant Model
 * AURA ARCHIVE - Unique items for resell (each variant is ONE physical item)
 */

module.exports = (sequelize, DataTypes) => {
    const Variant = sequelize.define('Variant', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        product_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id',
            },
        },
        sku: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        size: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        color: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        material: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        price_adjustment: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
            comment: 'Price adjustment from base_price',
        },
        status: {
            type: DataTypes.ENUM('AVAILABLE', 'RESERVED', 'SOLD'),
            defaultValue: 'AVAILABLE',
            allowNull: false,
        },
        reserved_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        reserved_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        sold_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: 'variants',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['sku'] },
            { fields: ['product_id'] },
            { fields: ['status'] },
            { fields: ['size'] },
            { fields: ['color'] },
        ],
    });

    Variant.associate = (models) => {
        Variant.belongsTo(models.Product, {
            foreignKey: 'product_id',
            as: 'product',
        });
        Variant.hasMany(models.OrderItem, {
            foreignKey: 'variant_id',
            as: 'orderItems',
        });
    };

    return Variant;
};
