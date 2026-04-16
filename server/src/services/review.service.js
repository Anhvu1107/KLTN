/**
 * Review Service
 * AURA ARCHIVE - Business logic for product reviews
 */

const { Review, User, Product, Variant, Order, OrderItem, sequelize } = require('../models');
const AppError = require('../utils/AppError');

const findDeliveredPurchase = async (userId, productId) => {
    return OrderItem.findOne({
        include: [
            {
                model: Order,
                as: 'order',
                where: {
                    user_id: userId,
                    status: 'DELIVERED',
                },
                required: true,
            },
            {
                model: Variant,
                as: 'variant',
                attributes: ['id'],
                required: true,
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id'],
                    where: {
                        id: productId,
                    },
                    required: true,
                }],
            },
        ],
    });
};

/**
 * Get reviews for a product
 */
const getProductReviews = async (productId, options = {}) => {
    const {
        page = 1,
        limit = 10,
        sort = 'newest',
    } = options;

    const offset = (page - 1) * limit;

    // Sort order
    let order;
    switch (sort) {
        case 'oldest':
            order = [['created_at', 'ASC']];
            break;
        case 'highest':
            order = [['rating', 'DESC'], ['created_at', 'DESC']];
            break;
        case 'lowest':
            order = [['rating', 'ASC'], ['created_at', 'DESC']];
            break;
        case 'helpful':
            order = [['helpful_count', 'DESC'], ['created_at', 'DESC']];
            break;
        case 'newest':
        default:
            order = [['created_at', 'DESC']];
    }

    const { count, rows } = await Review.findAndCountAll({
        where: {
            product_id: productId,
            is_approved: true,
        },
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'avatar_url'],
        }],
        order,
        limit,
        offset,
    });

    return {
        reviews: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};

/**
 * Get product rating summary
 */
const getProductRatingSummary = async (productId) => {
    const result = await Review.findAll({
        where: {
            product_id: productId,
            is_approved: true,
        },
        attributes: [
            [sequelize.fn('AVG', sequelize.col('rating')), 'average_rating'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews'],
        ],
        raw: true,
    });

    // Get rating distribution
    const distribution = await Review.findAll({
        where: {
            product_id: productId,
            is_approved: true,
        },
        attributes: [
            'rating',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['rating'],
        raw: true,
    });

    // Build distribution object (1-5 stars)
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach(item => {
        ratingDistribution[item.rating] = parseInt(item.count);
    });

    return {
        averageRating: parseFloat(result[0]?.average_rating) || 0,
        totalReviews: parseInt(result[0]?.total_reviews) || 0,
        distribution: ratingDistribution,
    };
};

/**
 * Create a new review
 */
const createReview = async (userId, productId, data) => {
    const { rating, title, comment, images } = data;

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
        throw new AppError('Product not found', 404);
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
        where: {
            user_id: userId,
            product_id: productId,
        },
    });

    if (existingReview) {
        throw new AppError('You have already reviewed this product', 400);
    }

    // REQUIRE: User must have purchased and received this product
    const hasPurchased = await findDeliveredPurchase(userId, productId);

    if (!hasPurchased) {
        throw new AppError('You can only review products you have purchased and received', 403);
    }

    const review = await Review.create({
        user_id: userId,
        product_id: productId,
        rating,
        title,
        comment,
        images: images || [],
        is_verified_purchase: true, // Always true now since purchase is required
        is_approved: true,
    });

    // Fetch the review with user info
    const createdReview = await Review.findByPk(review.id, {
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'avatar_url'],
        }],
    });

    return createdReview;
};

/**
 * Check if user is eligible to review a product
 */
const checkReviewEligibility = async (userId, productId) => {
    // Check if already reviewed
    const existingReview = await Review.findOne({
        where: { user_id: userId, product_id: productId },
    });

    if (existingReview) {
        return { eligible: false, reason: 'already_reviewed' };
    }

    // Check if user has a DELIVERED order with this product
    const hasPurchased = await findDeliveredPurchase(userId, productId);

    if (!hasPurchased) {
        return { eligible: false, reason: 'not_purchased' };
    }

    return { eligible: true };
};

/**
 * Update a review (only by owner)
 */
const updateReview = async (userId, reviewId, data) => {
    const review = await Review.findOne({
        where: {
            id: reviewId,
            user_id: userId,
        },
    });

    if (!review) {
        throw new AppError('Review not found or unauthorized', 404);
    }

    const { rating, title, comment, images } = data;

    await review.update({
        rating: rating || review.rating,
        title: title !== undefined ? title : review.title,
        comment: comment !== undefined ? comment : review.comment,
        images: images || review.images,
    });

    return review;
};

/**
 * Delete a review (by owner or admin)
 */
const deleteReview = async (userId, reviewId, isAdmin = false) => {
    const where = isAdmin ? { id: reviewId } : { id: reviewId, user_id: userId };

    const review = await Review.findOne({ where });

    if (!review) {
        throw new AppError('Review not found or unauthorized', 404);
    }

    await review.destroy();
    return { message: 'Review deleted successfully' };
};

/**
 * Mark review as helpful
 */
const markHelpful = async (reviewId) => {
    const review = await Review.findByPk(reviewId);

    if (!review) {
        throw new AppError('Review not found', 404);
    }

    await review.increment('helpful_count');
    return review;
};

/**
 * Admin: Get all reviews with filters
 */
const getAllReviews = async (options = {}) => {
    const {
        page = 1,
        limit = 20,
        status, // 'approved', 'pending', 'all'
        rating,
        productId,
    } = options;

    const offset = (page - 1) * limit;

    const where = {};

    if (status === 'approved') {
        where.is_approved = true;
    } else if (status === 'pending') {
        where.is_approved = false;
    }

    if (rating) {
        where.rating = rating;
    }

    if (productId) {
        where.product_id = productId;
    }

    const { count, rows } = await Review.findAndCountAll({
        where,
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'email', 'first_name', 'last_name'],
            },
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'slug', 'brand'],
            },
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset,
    });

    return {
        reviews: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};

/**
 * Admin: Approve/Reject review
 */
const moderateReview = async (reviewId, isApproved) => {
    const review = await Review.findByPk(reviewId);

    if (!review) {
        throw new AppError('Review not found', 404);
    }

    await review.update({ is_approved: isApproved });
    return review;
};

module.exports = {
    getProductReviews,
    getProductRatingSummary,
    createReview,
    checkReviewEligibility,
    updateReview,
    deleteReview,
    markHelpful,
    getAllReviews,
    moderateReview,
};
