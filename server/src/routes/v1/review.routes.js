/**
 * Review Routes
 * AURA ARCHIVE - Review API endpoints
 */

const express = require('express');
const router = express.Router();

const reviewController = require('../../controllers/review.controller');
const { authenticate, optionalAuth } = require('../../middlewares/auth.middleware');

// Public routes - Get reviews for a product
router.get('/products/:productId/reviews', reviewController.getProductReviews);
router.get('/products/:productId/reviews/summary', reviewController.getProductRatingSummary);

// Public route - Mark helpful (no auth required for simplicity)
router.post('/reviews/:reviewId/helpful', reviewController.markHelpful);

// Protected routes - Require authentication
router.post('/products/:productId/reviews', authenticate, reviewController.createReview);
router.put('/reviews/:reviewId', authenticate, reviewController.updateReview);
router.delete('/reviews/:reviewId', authenticate, reviewController.deleteReview);

module.exports = router;
