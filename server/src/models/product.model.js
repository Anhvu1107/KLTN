/**
 * Product Model
 * AURA ARCHIVE - Sequelize Model Definition
 */

module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define('Product', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING(300),
            allowNull: false,
            unique: true,
        },
        brand: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        base_price: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        sale_price: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        subcategory: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        condition_text: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'e.g., "9/10", "Like New", "Good"',
        },
        condition_description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        authenticity_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        images: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Array of image URLs',
        },
        tags: {
            type: DataTypes.JSONB,
            defaultValue: [],
        },
        is_featured: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        is_new_arrival: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Manually flag product as new arrival',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        view_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    }, {
        tableName: 'products',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['slug'] },
            { fields: ['brand'] },
            { fields: ['category'] },
            { fields: ['is_featured'] },
            { fields: ['is_active'] },
        ],
    });

    Product.associate = (models) => {
        Product.hasMany(models.Variant, {
            foreignKey: 'product_id',
            as: 'variants',
        });
        Product.hasMany(models.Review, {
            foreignKey: 'product_id',
            as: 'reviews',
        });
    };

    return Product;
};
