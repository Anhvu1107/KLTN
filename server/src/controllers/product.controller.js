/**
 * Product Controller
 * AURA ARCHIVE - Handle HTTP requests for products
 */

const productService = require('../services/product.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/products
 * Get all products with filters
 */
const getProducts = catchAsync(async (req, res) => {
    const result = await productService.getProducts(req.query);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/products/featured
 * Get featured products
 */
const getFeaturedProducts = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const products = await productService.getFeaturedProducts(limit);

    res.status(200).json({
        success: true,
        data: { products },
    });
});

/**
 * GET /api/v1/products/categories
 * Get product categories with counts
 */
const getCategories = catchAsync(async (req, res) => {
    const categories = await productService.getCategories();

    res.status(200).json({
        success: true,
        data: { categories },
    });
});

/**
 * GET /api/v1/products/brands
 * Get unique brands
 */
const getBrands = catchAsync(async (req, res) => {
    const brands = await productService.getBrands();

    res.status(200).json({
        success: true,
        data: { brands },
    });
});

/**
 * GET /api/v1/products/:id
 * Get product by ID or slug
 */
const getProductById = catchAsync(async (req, res) => {
    const product = await productService.getProductByIdOrSlug(req.params.id);

    res.status(200).json({
        success: true,
        data: { product },
    });
});

/**
 * GET /api/v1/products/:id/related
 * Get related products
 */
const getRelatedProducts = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 4;
    const products = await productService.getRelatedProducts(req.params.id, limit);

    res.status(200).json({
        success: true,
        data: { products },
    });
});

/**
 * GET /api/v1/products/best-sellers
 * Get best selling products
 */
const getBestSellers = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const products = await productService.getBestSellers(limit);

    res.status(200).json({
        success: true,
        data: { products },
    });
});

/**
 * GET /api/v1/products/sale
 * Get products on sale
 */
const getSaleProducts = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const products = await productService.getSaleProducts(limit);

    res.status(200).json({
        success: true,
        data: { products },
    });
});

/**
 * GET /api/v1/products/new-arrivals
 * Get manually flagged new arrival products
 */
const getNewArrivals = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 12;
    const page = parseInt(req.query.page) || 1;
    const result = await productService.getNewArrivals(limit, page);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/products/inventory-summary
 * Get inventory summary for AI chatbot
 */
const getInventorySummary = catchAsync(async (req, res) => {
    const summary = await productService.getInventorySummary();

    res.status(200).json({
        success: true,
        data: { summary },
    });
});

module.exports = {
    getProducts,
    getFeaturedProducts,
    getCategories,
    getBrands,
    getProductById,
    getRelatedProducts,
    getBestSellers,
    getSaleProducts,
    getNewArrivals,
    getInventorySummary,
};

