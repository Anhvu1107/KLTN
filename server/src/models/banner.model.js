/**
 * Banner Model
 * AURA ARCHIVE - Homepage banner management
 */

module.exports = (sequelize, DataTypes) => {
    const Banner = sequelize.define('Banner', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        subtitle: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        image_url: {
            type: DataTypes.STRING(500),
            allowNull: false,
        },
        link_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        button_text: {
            type: DataTypes.STRING(100),
            defaultValue: 'Shop Now',
        },
        position: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Display order',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        starts_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        ends_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: 'banners',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['is_active'] },
            { fields: ['position'] },
        ],
    });

    return Banner;
};
