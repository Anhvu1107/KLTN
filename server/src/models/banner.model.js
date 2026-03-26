/**
 * Banner Model
 * AURA ARCHIVE - Homepage banner management with section-based categorization
 */

const BANNER_SECTIONS = [
    'hero',
    'collection_women',
    'collection_men',
    'homepage_categories',
    'about',
    'page_sale',
    'page_new_arrivals',
    'page_featured',
    'general',
];

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
        section: {
            type: DataTypes.STRING(50),
            defaultValue: 'general',
            allowNull: false,
            comment: 'Where this banner appears: hero, collection_women, collection_men, category_bags, category_outerwear, category_accessories, about, general',
        },
        position: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Display order within same section',
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
            { fields: ['section'] },
        ],
    });

    return Banner;
};

module.exports.BANNER_SECTIONS = BANNER_SECTIONS;
