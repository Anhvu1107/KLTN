/**
 * Blog Service
 * AURA ARCHIVE - Blog management
 */

const { Blog, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Get published blogs with pagination
 */
const getPublishedBlogs = async (page = 1, limit = 10, category = null) => {
    const where = { status: 'published' };
    if (category) where.category = category;

    const offset = (page - 1) * limit;

    const { rows: blogs, count: total } = await Blog.findAndCountAll({
        where,
        include: [{ model: User, as: 'author', attributes: ['id', 'first_name', 'last_name'] }],
        order: [['published_at', 'DESC']],
        limit,
        offset,
    });

    return {
        blogs,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get blog by slug
 */
const getBlogBySlug = async (slug) => {
    const blog = await Blog.findOne({
        where: { slug, status: 'published' },
        include: [{ model: User, as: 'author', attributes: ['id', 'first_name', 'last_name'] }],
    });

    if (blog) {
        await blog.increment('view_count');
    }

    return blog;
};

/**
 * Get all blogs (admin)
 */
const getAllBlogs = async (page = 1, limit = 20) => {
    const offset = (page - 1) * limit;

    const { rows: blogs, count: total } = await Blog.findAndCountAll({
        include: [{ model: User, as: 'author', attributes: ['id', 'first_name', 'last_name'] }],
        order: [['created_at', 'DESC']],
        limit,
        offset,
    });

    return {
        blogs,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
};

/**
 * Create blog
 */
const createBlog = async (data, authorId) => {
    // Generate slug from title
    let slug = data.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existing = await Blog.findOne({ where: { slug } });
    if (existing) {
        slug = `${slug}-${Date.now()}`;
    }

    const blog = await Blog.create({
        ...data,
        slug,
        author_id: authorId,
        published_at: data.status === 'published' ? new Date() : null,
    });

    return blog;
};

/**
 * Update blog
 */
const updateBlog = async (id, data) => {
    const blog = await Blog.findByPk(id);
    if (!blog) throw new Error('Blog not found');

    // If publishing for the first time
    if (data.status === 'published' && blog.status !== 'published') {
        data.published_at = new Date();
    }

    await blog.update(data);
    return blog;
};

/**
 * Delete blog
 */
const deleteBlog = async (id) => {
    const blog = await Blog.findByPk(id);
    if (!blog) throw new Error('Blog not found');
    await blog.destroy();
    return { message: 'Blog deleted' };
};

/**
 * Get blog categories
 */
const getCategories = async () => {
    const blogs = await Blog.findAll({
        attributes: ['category'],
        where: { status: 'published' },
        group: ['category'],
    });
    return blogs.map(b => b.category).filter(Boolean);
};

module.exports = {
    getPublishedBlogs,
    getBlogBySlug,
    getAllBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    getCategories,
};
