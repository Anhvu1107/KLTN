/**
 * Review Routes
 * AURA ARCHIVE - Review API endpoints
 */

const express = require('express');
const router = express.Router();

const reviewController = require('../../controllers/review.controller');
const { protect } = require('../../middlewares/auth.middleware');

// Public routes - Get reviews for a product
router.get('/products/:productId/reviews', reviewController.getProductReviews);
router.get('/products/:productId/reviews/summary', reviewController.getProductRatingSummary);

// Public route - Mark helpful (no auth required for simplicity)
router.post('/reviews/:reviewId/helpful', reviewController.markHelpful);

// Protected routes - Require authentication
router.get('/products/:productId/reviews/eligibility', protect, reviewController.checkEligibility);
router.post('/products/:productId/reviews', protect, reviewController.createReview);
router.put('/reviews/:reviewId', protect, reviewController.updateReview);
router.delete('/reviews/:reviewId', protect, reviewController.deleteReview);

module.exports = router;
