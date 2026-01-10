/**
 * Newsletter Model
 * AURA ARCHIVE - Newsletter subscribers
 */

module.exports = (sequelize, DataTypes) => {
    const Newsletter = sequelize.define('Newsletter', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        subscribed_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        unsubscribed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: 'newsletters',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['email'] },
            { fields: ['is_active'] },
        ],
    });

    return Newsletter;
};
