/**
 * Abandoned Cart Model
 * AURA ARCHIVE - Track abandoned shopping carts
 */

module.exports = (sequelize, DataTypes) => {
    const AbandonedCart = sequelize.define('AbandonedCart', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            comment: 'Null for guest users',
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        items: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: 'Cart items snapshot',
        },
        total_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        recovery_token: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
        },
        status: {
            type: DataTypes.ENUM('active', 'recovered', 'expired', 'converted'),
            defaultValue: 'active',
        },
        reminder_sent_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        reminder_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        recovered_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Admin notes',
        },
    }, {
        tableName: 'abandoned_carts',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['email'] },
            { fields: ['status'] },
            { fields: ['recovery_token'], unique: true },
            { fields: ['created_at'] },
        ],
    });

    AbandonedCart.associate = (models) => {
        AbandonedCart.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return AbandonedCart;
};
