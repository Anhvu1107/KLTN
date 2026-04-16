/**
 * Admin Routes
 * AURA ARCHIVE - Admin API endpoints (protected)
 */

const express = require('express');
const router = express.Router();

const adminController = require('../../controllers/admin.controller');
const variantController = require('../../controllers/variant.controller');
const reviewController = require('../../controllers/review.controller');
const couponController = require('../../controllers/coupon.controller');
const { uploadProductImages } = require('../../services/upload.service');
const { protect } = require('../../middlewares/auth.middleware');
const { adminOnly } = require('../../middlewares/admin.middleware');

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// Dashboard
router.get('/stats', adminController.getStats);
router.get('/revenue/monthly', adminController.getMonthlyRevenue);

// Orders management
router.get('/orders', adminController.getAllOrders);
router.get('/orders/recent', adminController.getRecentOrders);
router.get('/orders/:id', adminController.getOrderById);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

// System prompts (AI configuration)
router.get('/system-prompts', adminController.getSystemPrompts);
router.get('/system-prompts/:key', adminController.getSystemPromptByKey);
router.put('/system-prompts/:key', adminController.updateSystemPrompt);
router.post('/voice-preview', adminController.previewVoice);

// Products management
router.get('/products', adminController.getProducts);
router.post('/products', adminController.createProduct);
router.get('/products/:id', adminController.getProductById);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.patch('/products/:id/variants/:variantId/status', adminController.updateVariantStatus);

// Variants management (dedicated routes)
router.get('/products/:productId/variants', variantController.getVariants);
router.post('/products/:productId/variants', variantController.createVariant);
router.get('/variants/:id', variantController.getVariant);
router.put('/variants/:id', variantController.updateVariant);
router.delete('/variants/:id', variantController.deleteVariant);
router.patch('/variants/:id/status', variantController.updateStatus);

// Users management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetail);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Reviews management
router.get('/reviews', reviewController.getAllReviews);
router.patch('/reviews/:reviewId/moderate', reviewController.moderateReview);
router.delete('/reviews/:reviewId', reviewController.deleteReview);

// Coupons management
router.get('/coupons', couponController.getAllCoupons);
router.post('/coupons', couponController.createCoupon);
router.get('/coupons/:id', couponController.getCouponById);
router.put('/coupons/:id', couponController.updateCoupon);
router.delete('/coupons/:id', couponController.deleteCoupon);
router.get('/coupons/:id/stats', couponController.getCouponStats);

// Banners management
const bannerController = require('../../controllers/banner.controller');
router.get('/banners', bannerController.getAllBanners);
router.post('/banners', bannerController.createBanner);
router.put('/banners/:id', bannerController.updateBanner);
router.delete('/banners/:id', bannerController.deleteBanner);

// Blog management
const blogController = require('../../controllers/blog.controller');
router.get('/blogs', blogController.getAllBlogs);
router.post('/blogs', blogController.createBlog);
router.put('/blogs/:id', blogController.updateBlog);
router.delete('/blogs/:id', blogController.deleteBlog);

// Site settings
const siteSettingsController = require('../../controllers/site-settings.controller');
router.get('/settings', siteSettingsController.getAllSettings);
router.put('/settings', siteSettingsController.updateSettings);
router.post('/settings/seed', siteSettingsController.seedSettings);

// Product attributes management
router.get('/product-attributes', siteSettingsController.getProductAttributes);
router.put('/product-attributes/:key', siteSettingsController.updateProductAttribute);

// Popups
const popupService = require('../../services/popup.service');
router.get('/popups', async (req, res) => {
    const popups = await popupService.getAllPopups();
    res.json({ success: true, data: { popups } });
});
router.post('/popups', async (req, res) => {
    const popup = await popupService.createPopup(req.body);
    res.json({ success: true, data: { popup } });
});
router.put('/popups/:id', async (req, res) => {
    const popup = await popupService.updatePopup(req.params.id, req.body);
    res.json({ success: true, data: { popup } });
});
router.delete('/popups/:id', async (req, res) => {
    await popupService.deletePopup(req.params.id);
    res.json({ success: true, message: 'Deleted' });
});

// Abandoned carts
const abandonedCartService = require('../../services/abandoned-cart.service');
router.get('/abandoned-carts', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const status = req.query.status || null;
    const result = await abandonedCartService.getAbandonedCarts(page, 20, status);
    res.json({ success: true, data: result });
});
router.patch('/abandoned-carts/:id/note', async (req, res) => {
    const cart = await abandonedCartService.addNote(req.params.id, req.body.note);
    res.json({ success: true, data: { cart } });
});

// Chat management
const chatAdminService = require('../../services/chat-admin.service');
const catchAsync = require('../../utils/catchAsync');

router.get('/chats', catchAsync(async (req, res) => {
    // Auto-sync sessions from logs on first visit
    await chatAdminService.syncSessionsFromLogs();
    // Auto-archive old sessions (30+ days inactive)
    await chatAdminService.autoArchiveOldSessions();

    const { page, limit, search, filter } = req.query;
    const result = await chatAdminService.getSessions({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 30,
        search,
        filter,
    });
    res.json({ success: true, data: result });
}));

router.get('/chats/:sessionId', catchAsync(async (req, res) => {
    const result = await chatAdminService.getSessionMessages(req.params.sessionId);
    res.json({ success: true, data: result });
}));

router.get('/chats/:sessionId/search', catchAsync(async (req, res) => {
    const messages = await chatAdminService.searchMessages(req.params.sessionId, req.query.q);
    res.json({ success: true, data: { messages } });
}));

router.patch('/chats/:sessionId/read', catchAsync(async (req, res) => {
    const session = await chatAdminService.markRead(req.params.sessionId);
    res.json({ success: true, data: { session } });
}));

router.patch('/chats/:sessionId/pause-ai', catchAsync(async (req, res) => {
    const session = await chatAdminService.toggleAiPause(req.params.sessionId);
    res.json({ success: true, data: { session } });
}));

router.patch('/chats/:sessionId/join', catchAsync(async (req, res) => {
    const session = await chatAdminService.joinRoom(req.params.sessionId);
    res.json({ success: true, data: { session } });
}));

router.patch('/chats/:sessionId/leave', catchAsync(async (req, res) => {
    const session = await chatAdminService.leaveRoom(req.params.sessionId);
    res.json({ success: true, data: { session } });
}));

router.put('/chats/:sessionId/customer', catchAsync(async (req, res) => {
    const session = await chatAdminService.saveCustomerInfo(req.params.sessionId, req.body);
    res.json({ success: true, data: { session } });
}));

router.post('/chats/:sessionId/message', catchAsync(async (req, res) => {
    const { content } = req.body;
    if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Content is required' });
    }
    const message = await chatAdminService.sendAdminMessage(req.params.sessionId, content.trim());
    res.json({ success: true, data: { message } });
}));

router.patch('/chats/:sessionId/close', catchAsync(async (req, res) => {
    const session = await chatAdminService.closeSession(req.params.sessionId);
    res.json({ success: true, data: { session } });
}));

router.patch('/chats/:sessionId/reopen', catchAsync(async (req, res) => {
    const session = await chatAdminService.reopenSession(req.params.sessionId);
    res.json({ success: true, data: { session } });
}));

router.delete('/chats/:sessionId', catchAsync(async (req, res) => {
    await chatAdminService.deleteSession(req.params.sessionId);
    res.json({ success: true, message: 'Deleted chat session successfully' });
}));

// Notifications
const notificationController = require('../../controllers/notification.controller');
router.get('/notifications', notificationController.getAdminNotifications);
router.get('/notifications/unread-count', notificationController.getAdminUnreadCount);
router.patch('/notifications/read-all', notificationController.markAllAdminAsRead);
router.patch('/notifications/:id/read', notificationController.markAdminAsRead);

// File uploads
router.post('/upload/product-images', uploadProductImages.array('images', 5), adminController.uploadProductImages);

// Avatar upload
const { uploadAvatar, uploadBanner, validateAndUpload } = require('../../services/upload.service');
router.post('/upload/avatar', uploadAvatar.single('avatar'), catchAsync(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { valid, url } = await validateAndUpload(req.file, 'aura/avatars');
    if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid image file' });
    }
    res.json({ success: true, data: { url } });
}));

// Banner image upload
router.post('/upload/banner', uploadBanner.single('banner'), catchAsync(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { valid, url } = await validateAndUpload(req.file, 'aura/banners');
    if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid image file' });
    }
    res.json({ success: true, data: { url } });
}));

// Page Content (Page Builder)
const pageContentService = require('../../services/page-content.service');
router.get('/page-content/pages', catchAsync(async (req, res) => {
    const pages = pageContentService.getManageablePages();
    const blockTypes = pageContentService.getBlockTypes();
    res.json({ success: true, data: { pages, blockTypes } });
}));
router.get('/page-content/:pageKey', catchAsync(async (req, res) => {
    const content = await pageContentService.getContentByPage(req.params.pageKey);
    res.json({ success: true, data: { content } });
}));
router.put('/page-content/:pageKey', catchAsync(async (req, res) => {
    const content = await pageContentService.saveContent(req.params.pageKey, req.body.blocks);
    res.json({ success: true, data: { content } });
}));
router.post('/page-content/:pageKey/publish', catchAsync(async (req, res) => {
    const content = await pageContentService.publishContent(req.params.pageKey);
    res.json({ success: true, data: { content } });
}));
router.post('/page-content/:pageKey/unpublish', catchAsync(async (req, res) => {
    const content = await pageContentService.unpublishContent(req.params.pageKey);
    res.json({ success: true, data: { content } });
}));

// Translation for page builder blocks (using Google Translate library)
router.post('/page-content/translate', catchAsync(async (req, res) => {
    const { texts, from = 'vi', to = 'en' } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ success: false, message: 'texts array is required' });
    }

    const translate = require('google-translate-api-x');

    // Batch translate all texts
    const results = await translate(texts, { from, to });

    // google-translate-api-x returns array for array input
    const translated = Array.isArray(results)
        ? results.map(r => r.text)
        : [results.text];

    res.json({ success: true, data: { translated } });
}));

module.exports = router;
