/**
 * Chat Routes
 * AURA ARCHIVE - AI Chat API endpoints
 */

const express = require('express');
const router = express.Router();

const chatController = require('../../controllers/chat.controller');
const voiceController = require('../../controllers/voice.controller');
const { optionalAuth } = require('../../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

// Stricter rate limit for AI chat — prevent API credit abuse
const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 messages per minute per IP
    message: {
        success: false,
        message: 'Too many messages. Please wait a moment before sending again.',
    },
});

// All routes use optional auth (works with or without login)
router.use(optionalAuth);

// Chat endpoints
router.post('/', chatLimiter, chatController.sendMessage);
router.get('/greeting', chatController.getGreeting);
router.get('/health', chatController.checkHealth);
router.get('/history/:sessionId', chatController.getChatHistory);
router.get('/appearance', chatController.getAppearance);

// Voice endpoints
router.get('/voice-token', voiceController.getVoiceToken);
router.post('/voice-tool-call', chatLimiter, voiceController.handleToolCall);

module.exports = router;
