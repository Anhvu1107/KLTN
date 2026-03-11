/**
 * Blog Routes
 * AURA ARCHIVE - Blog API endpoints (public)
 */

const express = require('express');
const router = express.Router();

const blogController = require('../../controllers/blog.controller');

// Public routes
router.get('/', blogController.getBlogs);
router.get('/categories', blogController.getCategories);
router.get('/:slug', blogController.getBlogBySlug);

module.exports = router;
