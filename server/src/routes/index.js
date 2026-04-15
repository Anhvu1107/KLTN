/**
 * Routes Index
 * AURA ARCHIVE - API route aggregation
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./v1/auth.routes');
const productRoutes = require('./v1/product.routes');
const orderRoutes = require('./v1/order.routes');
const adminRoutes = require('./v1/admin.routes');
const chatRoutes = require('./v1/chat.routes');
const wishlistRoutes = require('./v1/wishlist.routes');
const userRoutes = require('./v1/user.routes');
const contactRoutes = require('./v1/contact.routes');
const newsletterRoutes = require('./v1/newsletter.routes');
const reviewRoutes = require('./v1/review.routes');
const couponRoutes = require('./v1/coupon.routes');
const addressRoutes = require('./v1/address.routes');
const bannerRoutes = require('./v1/banner.routes');
const popupRoutes = require('./v1/popup.routes');
const locationRoutes = require('./v1/location.routes');
const paymentRoutes = require('./v1/payment.routes');
const abandonedCartRoutes = require('./v1/abandoned-cart.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/users', userRoutes);
router.use('/contact', contactRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/', reviewRoutes); // Reviews mounted at root for /products/:id/reviews pattern
router.use('/coupons', couponRoutes);
router.use('/addresses', addressRoutes);
router.use('/banners', bannerRoutes);
router.use('/popups', popupRoutes);
router.use('/locations', locationRoutes);
router.use('/payments', paymentRoutes);
router.use('/abandoned-carts', abandonedCartRoutes);

const blogRoutes = require('./v1/blog.routes');
router.use('/blogs', blogRoutes);

const shippingRoutes = require('./v1/shipping.routes');
router.use('/shipping', shippingRoutes);

const settingsRoutes = require('./v1/settings.routes');
router.use('/settings', settingsRoutes);

const notificationRoutes = require('./v1/notification.routes');
router.use('/notifications', notificationRoutes);

const pageContentRoutes = require('./v1/page-content.routes');
router.use('/page-content', pageContentRoutes);

const live2dRoutes = require('./v1/live2d.routes');
router.use('/live2d', live2dRoutes);

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'AURA ARCHIVE API is running',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
