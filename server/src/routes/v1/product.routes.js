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
router.get('/categories', productController.getCategories);
router.get('/brands', productController.getBrands);
router.get('/:id', productController.getProductById);

module.exports = router;
