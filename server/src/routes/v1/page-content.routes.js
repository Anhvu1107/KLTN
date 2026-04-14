/**
 * Page Content Routes (Public)
 * AURA ARCHIVE - Public endpoints for page content
 */

const express = require('express');
const router = express.Router();
const pageContentService = require('../../services/page-content.service');
const catchAsync = require('../../utils/catchAsync');

// Get published content for a page
router.get('/:pageKey', catchAsync(async (req, res) => {
    const content = await pageContentService.getPublishedContent(req.params.pageKey);
    res.json({ success: true, data: { content } });
}));

module.exports = router;
