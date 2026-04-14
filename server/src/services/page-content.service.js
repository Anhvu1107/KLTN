/**
 * PageContent Service
 * AURA ARCHIVE - CRUD operations for block-based page content
 */

const { PageContent } = require('../models');
const { v4: uuidv4 } = require('uuid');

const VALID_BLOCK_TYPES = [
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

const VALID_PAGES = ['about', 'contact', 'faqs', 'shipping', 'returns', 'terms', 'privacy'];

/**
 * Validate block structure
 */
const validateBlocks = (blocks) => {
    if (!Array.isArray(blocks)) {
        throw new Error('Blocks must be an array');
    }

    for (const block of blocks) {
        if (!block.type || !VALID_BLOCK_TYPES.includes(block.type)) {
            throw new Error(`Invalid block type: ${block.type}`);
        }
        if (!block.data || typeof block.data !== 'object') {
            throw new Error('Each block must have a data object');
        }
        if (!block.id) {
            block.id = uuidv4();
        }
    }

    return blocks;
};

/**
 * Get published content for a page (public)
 */
const getPublishedContent = async (pageKey) => {
    const content = await PageContent.findOne({
        where: { page_key: pageKey, is_published: true },
    });

    return content ? content.get({ plain: true }) : null;
};

/**
 * Get content for a page (admin — includes drafts)
 */
const getContentByPage = async (pageKey) => {
    const content = await PageContent.findOne({
        where: { page_key: pageKey },
    });

    return content ? content.get({ plain: true }) : null;
};

/**
 * Save content blocks for a page (create or update)
 */
const saveContent = async (pageKey, blocks) => {
    if (!VALID_PAGES.includes(pageKey)) {
        throw new Error(`Invalid page key: ${pageKey}. Valid pages: ${VALID_PAGES.join(', ')}`);
    }

    const validatedBlocks = validateBlocks(blocks);

    const existing = await PageContent.findOne({
        where: { page_key: pageKey },
    });

    if (existing) {
        await existing.update({ blocks: validatedBlocks });
        return existing.get({ plain: true });
    }

    const content = await PageContent.create({
        page_key: pageKey,
        blocks: validatedBlocks,
        is_published: false,
    });

    return content.get({ plain: true });
};

/**
 * Publish content for a page
 */
const publishContent = async (pageKey) => {
    const content = await PageContent.findOne({
        where: { page_key: pageKey },
    });

    if (!content) {
        throw new Error('No content found for this page. Save content first.');
    }

    if (!content.blocks || content.blocks.length === 0) {
        throw new Error('Cannot publish empty content');
    }

    await content.update({
        is_published: true,
        published_at: new Date(),
    });

    return content.get({ plain: true });
};

/**
 * Unpublish content (revert to locale fallback)
 */
const unpublishContent = async (pageKey) => {
    const content = await PageContent.findOne({
        where: { page_key: pageKey },
    });

    if (!content) {
        throw new Error('No content found for this page');
    }

    await content.update({
        is_published: false,
    });

    return content.get({ plain: true });
};

/**
 * Get list of available block types
 */
const getBlockTypes = () => {
    return VALID_BLOCK_TYPES;
};

/**
 * Get list of manageable pages
 */
const getManageablePages = () => {
    return VALID_PAGES;
};

module.exports = {
    getPublishedContent,
    getContentByPage,
    saveContent,
    publishContent,
    unpublishContent,
    getBlockTypes,
    getManageablePages,
};
