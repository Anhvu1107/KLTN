/**
 * Address Routes
 * AURA ARCHIVE - Address API endpoints (protected)
 */

const express = require('express');
const router = express.Router();

const addressController = require('../../controllers/address.controller');
const { protect } = require('../../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

router.get('/', addressController.getAddresses);
router.get('/default', addressController.getDefaultAddress);
router.get('/:id', addressController.getAddressById);
router.post('/', addressController.createAddress);
router.put('/:id', addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);
router.patch('/:id/default', addressController.setDefaultAddress);

module.exports = router;
