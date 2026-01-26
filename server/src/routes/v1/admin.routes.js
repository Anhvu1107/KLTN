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
router.patch('/orders/:id/status', adminController.updateOrderStatus);

// System prompts (AI configuration)
router.get('/system-prompts', adminController.getSystemPrompts);
router.get('/system-prompts/:key', adminController.getSystemPromptByKey);
router.put('/system-prompts/:key', adminController.updateSystemPrompt);

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

// File uploads
router.post('/upload/product-images', uploadProductImages.array('images', 5), adminController.uploadProductImages);

module.exports = router;
