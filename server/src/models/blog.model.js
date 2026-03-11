/**
 * Blog Model
 * AURA ARCHIVE - Blog posts and articles
 */

module.exports = (sequelize, DataTypes) => {
    const Blog = sequelize.define('Blog', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING(300),
            allowNull: false,
            unique: true,
        },
        excerpt: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Short description for listing',
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        featured_image: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: 'News',
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
        },
        author_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
        },
        status: {
            type: DataTypes.ENUM('draft', 'published', 'archived'),
            defaultValue: 'draft',
        },
        view_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        published_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: 'blogs',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['slug'], unique: true },
            { fields: ['status'] },
            { fields: ['category'] },
            { fields: ['published_at'] },
        ],
    });

    Blog.associate = (models) => {
        Blog.belongsTo(models.User, { foreignKey: 'author_id', as: 'author' });
    };

    return Blog;
};
