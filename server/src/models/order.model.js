/**
 * Order Model
 * AURA ARCHIVE - Customer Orders
 */

module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define('Order', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        order_number: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        status: {
            type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'),
            defaultValue: 'PENDING',
            allowNull: false,
        },
        subtotal: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        shipping_fee: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
        },
        discount_amount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
        },
        shipping_discount_amount: {
            type: DataTypes.DECIMAL(12, 2),
            defaultValue: 0,
        },
        total_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        payment_method: {
            type: DataTypes.ENUM('COD', 'BANK_TRANSFER', 'CREDIT_CARD', 'MOMO', 'VNPAY', 'PAYPAL'),
            allowNull: false,
        },
        payment_status: {
            type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED'),
            defaultValue: 'PENDING',
        },
        shipping_address: {
            type: DataTypes.JSONB,
            allowNull: false,
            comment: '{ fullName, phone, address, city, district, ward, notes }',
        },
        billing_address: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        tracking_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        payment_transaction_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Transaction ID from payment gateway (VNPay/MoMo/PayPal)',
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        confirmed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        shipped_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        delivered_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        cancelled_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: 'orders',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['order_number'] },
            { fields: ['user_id'] },
            { fields: ['status'] },
            { fields: ['payment_status'] },
            { fields: ['created_at'] },
        ],
    });

    Order.associate = (models) => {
        Order.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
        Order.hasMany(models.OrderItem, {
            foreignKey: 'order_id',
            as: 'items',
        });
    };

    // Generate unique order number
    Order.beforeValidate(async (order) => {
        if (!order.order_number) {
            const date = new Date();
            // Format: AA + YYMM + DDHHMM + 2-digit random
            // e.g., AA2603-231459-42 → ~1M unique values/month vs old 9000
            const prefix = `AA${date.getFullYear().toString().slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
            const timePart = `${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
            const random = String(Math.floor(Math.random() * 100)).padStart(2, '0');
            order.order_number = `${prefix}-${timePart}-${random}`;
        }
    });

    return Order;
};
