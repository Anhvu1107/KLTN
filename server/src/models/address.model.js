/**
 * Address Model
 * AURA ARCHIVE - User shipping addresses
 */

module.exports = (sequelize, DataTypes) => {
    const Address = sequelize.define('Address', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        label: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'e.g., Home, Office, etc.',
        },
        full_name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        address_line1: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        address_line2: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        district: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        ward: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        postal_code: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        country: {
            type: DataTypes.STRING(100),
            defaultValue: 'Vietnam',
        },
        is_default: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        tableName: 'addresses',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['user_id', 'is_default'] },
        ],
    });

    Address.associate = (models) => {
        Address.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
    };

    return Address;
};
