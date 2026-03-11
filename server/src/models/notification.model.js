/**
 * Notification Model
 * AURA ARCHIVE - In-app notifications for users and admin
 */

module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true, // null for admin-only notifications
            references: {
                model: 'users',
                key: 'id',
            },
        },
        type: {
            type: DataTypes.ENUM(
                'ORDER_PLACED',
                'ORDER_CONFIRMED',
                'ORDER_PROCESSING',
                'ORDER_SHIPPED',
                'ORDER_DELIVERED',
                'ORDER_CANCELLED',
                'PAYMENT_SUCCESS',
                'PAYMENT_FAILED'
            ),
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        data: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: '{ orderId, orderNumber, ... }',
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_admin: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        tableName: 'notifications',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['is_admin'] },
            { fields: ['is_read'] },
            { fields: ['type'] },
            { fields: ['created_at'] },
        ],
    });

    Notification.associate = (models) => {
        Notification.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
    };

    return Notification;
};
