/**
 * User Model
 * AURA ARCHIVE - Sequelize Model Definition
 */

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
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
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: true, // Null for OAuth users
        },
        first_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        last_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        avatar_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        google_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
            unique: true,
        },
        facebook_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
            unique: true,
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        role: {
            type: DataTypes.ENUM('ADMIN', 'CUSTOMER'),
            defaultValue: 'CUSTOMER',
            allowNull: false,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        reset_token: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        reset_token_expires: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        otp_code: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        otp_expires: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        district: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        ward: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: 'users',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['email'] },
            { fields: ['role'] },
            { fields: ['reset_token'] },
        ],
    });

    User.associate = (models) => {
        User.hasMany(models.Order, {
            foreignKey: 'user_id',
            as: 'orders',
        });
        User.hasMany(models.ChatLog, {
            foreignKey: 'user_id',
            as: 'chatLogs',
        });
        User.hasMany(models.Review, {
            foreignKey: 'user_id',
            as: 'reviews',
        });
    };

    return User;
};
