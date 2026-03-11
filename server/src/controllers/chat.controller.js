/**
 * Chat Controller
 * AURA ARCHIVE - Handle HTTP requests for AI chat
 */

const aiService = require('../services/ai.service');
const { SystemPrompt } = require('../models');
const catchAsync = require('../utils/catchAsync');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/v1/chat
 * Send message to AI stylist
 */
const sendMessage = catchAsync(async (req, res) => {
    const { message, sessionId, context } = req.body;
    const userId = req.user?.id || null;

    if (!message || !message.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Message is required',
        });
    }

    // Generate session ID if not provided
    const chatSessionId = sessionId || uuidv4();

    const result = await aiService.chat(message, chatSessionId, userId, context);

    res.status(200).json(result);
});

/**
 * GET /api/v1/chat/greeting
 * Get initial greeting message
 */
const getGreeting = catchAsync(async (req, res) => {
    const greeting = await aiService.getGreeting();

    res.status(200).json({
        success: true,
        message: greeting,
        sessionId: uuidv4(),
    });
});

/**
 * GET /api/v1/chat/history/:sessionId
 * Get chat history for a session
 */
const getChatHistory = catchAsync(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user?.id || null;

    const messages = await aiService.getChatHistory(sessionId, userId);

    res.status(200).json({
        success: true,
        data: { messages },
    });
});

/**
 * GET /api/v1/chat/health
 * Check AI service health
 */
const checkHealth = catchAsync(async (req, res) => {
    const health = await aiService.checkHealth();

    res.status(200).json({
        success: true,
        data: health,
    });
});

/**
 * GET /api/v1/chat/appearance
 * Get chat widget appearance config
 */
const getAppearance = catchAsync(async (req, res) => {
    const DEFAULT_APPEARANCE = {
        chatName: 'AURA Stylist',
        chatDescription: 'Trợ lý thời trang của bạn',
        avatarUrl: '',
        headerBgColor: '#1a1a1a',
        headerTextColor: '#ffffff',
        botBgColor: '#f5f5f5',
        botTextColor: '#262626',
        userBgColor: '#1a1a1a',
        userTextColor: '#ffffff',
    };

    try {
        const prompt = await SystemPrompt.findOne({
            where: { key: 'CHAT_APPEARANCE', is_active: true },
        });
        const appearance = prompt ? JSON.parse(prompt.content) : DEFAULT_APPEARANCE;
        res.status(200).json({ success: true, data: appearance });
    } catch {
        res.status(200).json({ success: true, data: DEFAULT_APPEARANCE });
    }
});

module.exports = {
    sendMessage,
    getGreeting,
    getChatHistory,
    checkHealth,
    getAppearance,
};
