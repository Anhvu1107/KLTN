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

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/users', userRoutes);

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'AURA ARCHIVE API is running',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
