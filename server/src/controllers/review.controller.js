/**
 * Review Controller
 * AURA ARCHIVE - Handle HTTP requests for reviews
 */

const reviewService = require('../services/review.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/products/:productId/reviews
 * Get reviews for a product
 */
const getProductReviews = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const result = await reviewService.getProductReviews(productId, req.query);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/v1/products/:productId/reviews/summary
 * Get rating summary for a product
 */
const getProductRatingSummary = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const summary = await reviewService.getProductRatingSummary(productId);

    res.status(200).json({
        success: true,
        data: summary,
    });
});

/**
 * POST /api/v1/products/:productId/reviews
 * Create a review
 */
const createReview = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user.id;

    const review = await reviewService.createReview(userId, productId, req.body);

    res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: { review },
    });
});

/**
 * PUT /api/v1/reviews/:reviewId
 * Update a review (owner only)
 */
const updateReview = catchAsync(async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await reviewService.updateReview(userId, reviewId, req.body);

    res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: { review },
    });
});

/**
 * DELETE /api/v1/reviews/:reviewId
 * Delete a review (owner or admin)
 */
const deleteReview = catchAsync(async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    await reviewService.deleteReview(userId, reviewId, isAdmin);

    res.status(200).json({
        success: true,
        message: 'Review deleted successfully',
    });
});

/**
 * GET /api/v1/products/:productId/reviews/eligibility
 * Check if user can review this product
 */
const checkEligibility = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user.id;

    const result = await reviewService.checkReviewEligibility(userId, productId);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * POST /api/v1/reviews/:reviewId/helpful
 * Mark review as helpful
 */
const markHelpful = catchAsync(async (req, res) => {
    const { reviewId } = req.params;

    await reviewService.markHelpful(reviewId);

    res.status(200).json({
        success: true,
        message: 'Marked as helpful',
    });
});

/**
 * GET /api/v1/admin/reviews
 * Admin: Get all reviews with filters
 */
const getAllReviews = catchAsync(async (req, res) => {
    const result = await reviewService.getAllReviews(req.query);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * PATCH /api/v1/admin/reviews/:reviewId/moderate
 * Admin: Approve/Reject review
 */
const moderateReview = catchAsync(async (req, res) => {
    const { reviewId } = req.params;
    const { is_approved } = req.body;

    const review = await reviewService.moderateReview(reviewId, is_approved);

    res.status(200).json({
        success: true,
        message: `Review ${is_approved ? 'approved' : 'rejected'}`,
        data: { review },
    });
});

module.exports = {
    getProductReviews,
    getProductRatingSummary,
    createReview,
    checkEligibility,
    updateReview,
    deleteReview,
    markHelpful,
    getAllReviews,
    moderateReview,
};
