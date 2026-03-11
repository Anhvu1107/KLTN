/**
 * Product Routes
 * AURA ARCHIVE - Product API endpoints (public)
 */

const express = require('express');
const router = express.Router();

const productController = require('../../controllers/product.controller');

// Public routes
router.get('/', productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/new-arrivals', productController.getNewArrivals);
router.get('/best-sellers', productController.getBestSellers);
router.get('/sale', productController.getSaleProducts);
router.get('/categories', productController.getCategories);
router.get('/brands', productController.getBrands);
router.get('/inventory-summary', productController.getInventorySummary);
router.get('/:id', productController.getProductById);
router.get('/:id/related', productController.getRelatedProducts);

module.exports = router;
