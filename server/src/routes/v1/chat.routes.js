/**
 * Chat Routes
 * AURA ARCHIVE - AI Chat API endpoints
 */

const express = require('express');
const router = express.Router();

const chatController = require('../../controllers/chat.controller');
const { optionalAuth } = require('../../middlewares/auth.middleware');

// All routes use optional auth (works with or without login)
router.use(optionalAuth);

// Chat endpoints
router.post('/', chatController.sendMessage);
router.get('/greeting', chatController.getGreeting);
router.get('/health', chatController.checkHealth);
router.get('/history/:sessionId', chatController.getChatHistory);
router.get('/appearance', chatController.getAppearance);

module.exports = router;
