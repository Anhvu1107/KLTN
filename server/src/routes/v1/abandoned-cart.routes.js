/**
 * Abandoned Cart Routes
 * AURA ARCHIVE - Customer cart recovery endpoints
 */

const express = require('express');
const router = express.Router();

const abandonedCartController = require('../../controllers/abandoned-cart.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

router.post('/track', abandonedCartController.trackAbandonedCart);
router.post('/recover-current', abandonedCartController.recoverCurrentCart);

module.exports = router;
