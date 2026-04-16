/**
 * Admin Controller
 * AURA ARCHIVE - Handle HTTP requests for admin dashboard
 */

const adminService = require('../services/admin.service');
const { processUploadedFiles } = require('../services/upload.service');
const voiceService = require('../services/voice.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/admin/stats
 * Get dashboard statistics
 */
const getStats = catchAsync(async (req, res) => {
    const stats = await adminService.getStats();

    res.status(200).json({
        success: true,
        data: { stats },
    });
});

/**
 * GET /api/v1/admin/revenue/monthly
 * Get revenue data for charts
 * Query params: view (year|quarter|month), year, month, quarter
 */
const getMonthlyRevenue = catchAsync(async (req, res) => {
    const { view = 'year', year, month, quarter } = req.query;
    const data = await adminService.getRevenue(
        view,
        year ? parseInt(year) : undefined,
        month ? parseInt(month) : undefined,
        quarter ? parseInt(quarter) : undefined
    );

    res.status(200).json({
        success: true,
        data,
    });
});

/**
 * GET /api/v1/admin/orders/recent
 * Get recent orders
 */
const getRecentOrders = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const orders = await adminService.getRecentOrders(limit);

    res.status(200).json({
        success: true,
        data: { orders },
    });
});

/**
 * GET /api/v1/admin/orders
 * Get all orders with filters
 */
const getAllOrders = catchAsync(async (req, res) => {
    const result = await adminService.getAllOrders(req.query);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * PATCH /api/v1/admin/orders/:id/status
 * Update order status
 */
const updateOrderStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const order = await adminService.updateOrderStatus(id, status);

    res.status(200).json({
        success: true,
        message: `Order status updated to ${status}`,
        data: { order },
    });
});

/**
 * GET /api/v1/admin/orders/:id
 * Get order detail (admin)
 */
const getOrderById = catchAsync(async (req, res) => {
    const orderService = require('../services/order.service');
    const order = await orderService.getOrderById(req.params.id);

    res.status(200).json({
        success: true,
        data: { order },
    });
});

/**
 * GET /api/v1/admin/system-prompts
 * Get all system prompts
 */
const getSystemPrompts = catchAsync(async (req, res) => {
    const prompts = await adminService.getSystemPrompts();

    res.status(200).json({
        success: true,
        data: { prompts },
    });
});

/**
 * GET /api/v1/admin/system-prompts/:key
 * Get system prompt by key
 */
const getSystemPromptByKey = catchAsync(async (req, res) => {
    const prompt = await adminService.getSystemPromptByKey(req.params.key);

    res.status(200).json({
        success: true,
        data: { prompt },
    });
});

/**
 * PUT /api/v1/admin/system-prompts/:key
 * Update system prompt
 */
const updateSystemPrompt = catchAsync(async (req, res) => {
    const { key } = req.params;
    const { content, name, description } = req.body;

    const prompt = await adminService.updateSystemPrompt(key, content, name, description);

    res.status(200).json({
        success: true,
        message: 'System prompt updated successfully',
        data: { prompt },
    });
});

const previewVoice = catchAsync(async (req, res) => {
    const preview = await voiceService.generateVoicePreview({
        voiceName: req.body?.voiceName,
        text: req.body?.text,
    });

    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Surrogate-Control': 'no-store',
    });

    res.status(200).json({
        success: true,
        data: preview,
    });
});

// Product management
const productAdminService = require('../services/product-admin.service');

/**
 * POST /api/v1/admin/products
 * Create new product with variant
 */
const createProduct = catchAsync(async (req, res) => {
    const { product: productData, variant: variantData } = req.body;

    if (!productData || !productData.name || !productData.brand) {
        return res.status(400).json({
            success: false,
            message: 'Product name and brand are required',
        });
    }

    const product = await productAdminService.createProduct(productData, variantData || {});

    res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
    });
});

/**
 * GET /api/v1/admin/products
 * Get all products for admin
 */
const getProducts = catchAsync(async (req, res) => {
    const result = await productAdminService.getAllProducts(req.query);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/admin/products/:id
 * Get single product for editing
 */
const getProductById = catchAsync(async (req, res) => {
    const { Product, Variant } = require('../models');
    const product = await Product.findByPk(req.params.id, {
        include: [{ model: Variant, as: 'variants' }],
    });

    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found',
        });
    }

    res.status(200).json({
        success: true,
        data: { product },
    });
});

/**
 * PUT /api/v1/admin/products/:id
 * Update product
 */
const updateProduct = catchAsync(async (req, res) => {
    const product = await productAdminService.updateProduct(req.params.id, req.body);

    res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product },
    });
});

/**
 * DELETE /api/v1/admin/products/:id
 * Delete (deactivate) product
 */
const deleteProduct = catchAsync(async (req, res) => {
    const result = await productAdminService.deleteProduct(req.params.id);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

/**
 * PATCH /api/v1/admin/products/:id/variants/:variantId/status
 * Update variant status (AVAILABLE, RESERVED, SOLD)
 */
const updateVariantStatus = catchAsync(async (req, res) => {
    const { Variant } = require('../models');
    const { status } = req.body;

    const variant = await Variant.findByPk(req.params.variantId);
    if (!variant) {
        return res.status(404).json({
            success: false,
            message: 'Variant not found',
        });
    }

    await variant.update({ status });

    res.status(200).json({
        success: true,
        message: `Variant status updated to ${status}`,
        data: { variant },
    });
});

// User management
const userService = require('../services/user.service');

/**
 * GET /api/v1/admin/users
 * Get all users
 */
const getUsers = catchAsync(async (req, res) => {
    const result = await userService.getAllUsers(req.query);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/admin/users/:id
 * Get user detail with stats
 */
const getUserDetail = catchAsync(async (req, res) => {
    const result = await userService.getUserDetail(req.params.id);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * PATCH /api/v1/admin/users/:id/status
 * Update user status
 */
const updateUserStatus = catchAsync(async (req, res) => {
    const { is_active } = req.body;
    const user = await userService.updateUserStatus(req.params.id, is_active);

    res.status(200).json({
        success: true,
        message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
        data: { user },
    });
});

/**
 * DELETE /api/v1/admin/users/:id
 * Delete user (cannot delete admins)
 */
const deleteUser = catchAsync(async (req, res) => {
    const { User } = require('../models');
    const user = await User.findByPk(req.params.id);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Cannot delete admin user' });
    }
    await user.destroy();
    res.status(200).json({ success: true, message: 'User deleted successfully' });
});

/**
 * POST /api/v1/admin/upload/product-images
 * Upload product images (max 5)
 */
const uploadProductImages = catchAsync(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No files uploaded',
        });
    }

    const urls = await processUploadedFiles(req.files);

    if (urls.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'All files were rejected (invalid format)',
        });
    }

    res.status(200).json({
        success: true,
        message: `${urls.length} file(s) uploaded successfully`,
        data: {
            urls,
            count: urls.length,
        },
    });
});

module.exports = {
    getStats,
    getMonthlyRevenue,
    getRecentOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    getSystemPrompts,
    getSystemPromptByKey,
    updateSystemPrompt,
    previewVoice,
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    updateVariantStatus,
    getUsers,
    getUserDetail,
    updateUserStatus,
    deleteUser,
    uploadProductImages,
};
