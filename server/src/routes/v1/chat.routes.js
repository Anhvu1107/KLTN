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
    max: 60, // Text chat can be bursty on storefront; keep it generous.
    message: {
        success: false,
        message: 'Too many messages. Please wait a moment before sending again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const voiceLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 180, // Voice turns fan out into sync/tool-call requests very quickly.
    message: {
        success: false,
        message: 'Voice AI is receiving too many requests right now. Please wait a moment and try again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
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
router.get('/voice-settings', voiceController.getVoiceSettings);
router.get('/voice-token', voiceLimiter, voiceController.getVoiceToken);
router.post('/voice-tool-call', voiceLimiter, voiceController.handleToolCall);
router.post('/voice-sync', voiceLimiter, voiceController.syncTranscript);

module.exports = router;
