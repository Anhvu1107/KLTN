/**
 * Review Model
 * AURA ARCHIVE - Product Reviews & Ratings
 */

module.exports = (sequelize, DataTypes) => {
    const Review = sequelize.define('Review', {
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
        product_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id',
            },
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                max: 5,
            },
            comment: 'Rating from 1 to 5 stars',
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'Optional review title',
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Review content',
        },
        images: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Array of review image URLs',
        },
        is_verified_purchase: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'True if user has purchased this product',
        },
        is_approved: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Admin can moderate reviews',
        },
        helpful_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Number of users who found this review helpful',
        },
    }, {
        tableName: 'reviews',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['product_id'] },
            { fields: ['user_id'] },
            { fields: ['rating'] },
            { fields: ['is_approved'] },
            { fields: ['created_at'] },
            // Ensure one review per user per product
            {
                unique: true,
                fields: ['user_id', 'product_id'],
                name: 'unique_user_product_review'
            },
        ],
    });

    Review.associate = (models) => {
        Review.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
        Review.belongsTo(models.Product, {
            foreignKey: 'product_id',
            as: 'product',
        });
    };

    return Review;
};
