/**
 * PageContent Model
 * AURA ARCHIVE - Block-based page content management
 * Stores structured content blocks for static pages (about, contact, etc.)
 */

const BLOCK_TYPES = [
    'hero_text',
    'image_text',
    'fullwidth_text',
    'values_grid',
    'cta',
    'video_embed',
    'testimonial',
    'team_grid',
    'image_gallery',
    'stats_counter',
    'divider',
    'faq',
];

module.exports = (sequelize, DataTypes) => {
    const PageContent = sequelize.define('PageContent', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        page_key: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Page identifier: about, contact, etc.',
        },
        blocks: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
            comment: 'Array of content blocks with type, data, and order',
        },
        is_published: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        published_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: 'page_contents',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['page_key'] },
            { fields: ['is_published'] },
        ],
    });

    return PageContent;
};

module.exports.BLOCK_TYPES = BLOCK_TYPES;
