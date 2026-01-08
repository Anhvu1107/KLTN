/**
 * Wishlist Routes
 * AURA ARCHIVE - Wishlist API endpoints
 */

const express = require('express');
const router = express.Router();

const wishlistController = require('../../controllers/wishlist.controller');
const { protect } = require('../../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addToWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);
router.get('/check/:productId', wishlistController.checkWishlist);

module.exports = router;
