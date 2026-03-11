/**
 * OrderItem Model
 * AURA ARCHIVE - Individual items in an order
 */

module.exports = (sequelize, DataTypes) => {
    const OrderItem = sequelize.define('OrderItem', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        order_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'id',
            },
        },
        variant_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'variants',
                key: 'id',
            },
        },
        product_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Snapshot of product name at time of order',
        },
        product_brand: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        variant_size: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        variant_color: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        price: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            comment: 'Price at time of purchase',
        },
        quantity: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: 'Always 1 for resell items',
        },
        total: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
    }, {
        tableName: 'order_items',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['order_id'] },
            { fields: ['variant_id'] },
        ],
    });

    OrderItem.associate = (models) => {
        OrderItem.belongsTo(models.Order, {
            foreignKey: 'order_id',
            as: 'order',
        });
        OrderItem.belongsTo(models.Variant, {
            foreignKey: 'variant_id',
            as: 'variant',
        });
    };

    return OrderItem;
};
