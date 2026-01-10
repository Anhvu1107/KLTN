/**
 * Blog Controller
 * AURA ARCHIVE - Blog API handlers
 */

const blogService = require('../services/blog.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/blogs
 * Get published blogs
 */
const getBlogs = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || null;

    const result = await blogService.getPublishedBlogs(page, limit, category);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/blogs/categories
 * Get blog categories
 */
const getCategories = catchAsync(async (req, res) => {
    const categories = await blogService.getCategories();

    res.status(200).json({
        success: true,
        data: { categories },
    });
});

/**
 * GET /api/v1/blogs/:slug
 * Get blog by slug
 */
const getBlogBySlug = catchAsync(async (req, res) => {
    const blog = await blogService.getBlogBySlug(req.params.slug);

    if (!blog) {
        return res.status(404).json({
            success: false,
            message: 'Blog not found',
        });
    }

    res.status(200).json({
        success: true,
        data: { blog },
    });
});

/**
 * GET /api/v1/admin/blogs
 * Get all blogs (admin)
 */
const getAllBlogs = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await blogService.getAllBlogs(page, limit);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * POST /api/v1/admin/blogs
 * Create blog (admin)
 */
const createBlog = catchAsync(async (req, res) => {
    const blog = await blogService.createBlog(req.body, req.user.id);

    res.status(201).json({
        success: true,
        message: 'Blog created',
        data: { blog },
    });
});

/**
 * PUT /api/v1/admin/blogs/:id
 * Update blog (admin)
 */
const updateBlog = catchAsync(async (req, res) => {
    const blog = await blogService.updateBlog(req.params.id, req.body);

    res.status(200).json({
        success: true,
        message: 'Blog updated',
        data: { blog },
    });
});

/**
 * DELETE /api/v1/admin/blogs/:id
 * Delete blog (admin)
 */
const deleteBlog = catchAsync(async (req, res) => {
    await blogService.deleteBlog(req.params.id);

    res.status(200).json({
        success: true,
        message: 'Blog deleted',
    });
});

module.exports = {
    getBlogs,
    getCategories,
    getBlogBySlug,
    getAllBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
};
