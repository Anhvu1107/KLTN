/**
 * AI Service
 * AURA ARCHIVE - Integrated AI Stylist (formerly separate Python service)
 * Now runs locally within Node.js server — no external HTTP calls needed.
 */

const { SystemPrompt, ChatLog } = require('../models');
const logger = require('../utils/logger');
const chatAdminService = require('./chat-admin.service');
const { emitNewMessage } = require('../socket');
const { getEngine } = require('./ai/stylist-engine');

/**
 * Get the current AI persona from database
 */
const getPersona = async () => {
    try {
        const prompt = await SystemPrompt.findOne({
            where: { key: 'STYLIST_PERSONA', is_active: true },
        });
        return prompt?.content || null;
    } catch (error) {
        logger.error('Failed to fetch AI persona:', error);
        return null;
    }
};

/**
 * Get greeting message
 */
const getGreeting = async () => {
    try {
        const prompt = await SystemPrompt.findOne({
            where: { key: 'GREETING_MESSAGE', is_active: true },
        });
        return prompt?.content || 'Chào mừng bạn đến AURA ARCHIVE! Mình là AURA, stylist thời trang AI chuyên nghiệp. Mình có thể giúp gì cho bạn hôm nay?';
    } catch (error) {
        return 'Chào mừng bạn đến AURA ARCHIVE! Mình là AURA, stylist thời trang AI chuyên nghiệp. Mình có thể giúp gì cho bạn hôm nay?';
    }
};

/**
 * Send message to AI stylist (now runs locally)
 */
const chat = async (message, sessionId, userId = null, context = null) => {
    try {
        // Check if AI is paused for this session
        const isPaused = await chatAdminService.isAiPaused(sessionId);
        if (isPaused) {
            await logMessage(userId, sessionId, 'USER', message);
            await chatAdminService.updateSessionStats(sessionId, message, userId);
            emitNewMessage(sessionId, { role: 'USER', content: message });

            return {
                success: true,
                message: null,
                sessionId,
                metadata: { paused: true },
            };
        }

        // Get current persona from database
        const systemPrompt = await getPersona();

        // Process message locally via StylistEngine (no HTTP call needed)
        const engine = getEngine();
        const aiResponse = await engine.processMessage(
            message,
            sessionId,
            userId,
            context,
            systemPrompt,
        );

        // Log the conversation
        await logMessage(userId, sessionId, 'USER', message);
        await logMessage(userId, sessionId, 'ASSISTANT', aiResponse.message);

        // Emit real-time events
        emitNewMessage(sessionId, { role: 'USER', content: message });
        emitNewMessage(sessionId, { role: 'ASSISTANT', content: aiResponse.message });

        // Update session stats for admin view
        await chatAdminService.updateSessionStats(sessionId, aiResponse.message, userId);

        return {
            success: true,
            message: aiResponse.message,
            sessionId,
            metadata: aiResponse.metadata,
        };

    } catch (error) {
        logger.error('AI Service Error:', error.message);

        const fallbackMessage = 'Xin lỗi, mình đang gặp sự cố. Bạn vui lòng thử lại sau một chút nhé!';
        try {
            await logMessage(userId, sessionId, 'USER', message);
            await logMessage(userId, sessionId, 'ASSISTANT', fallbackMessage);
            await chatAdminService.updateSessionStats(sessionId, message, userId);
        } catch (logError) {
            logger.error('Failed to log error chat:', logError.message);
        }

        return {
            success: false,
            message: fallbackMessage,
            sessionId,
            error: error.message,
        };
    }
};

/**
 * Log chat message to database
 */
const logMessage = async (userId, sessionId, role, content) => {
    try {
        await ChatLog.create({
            user_id: userId,
            session_id: sessionId,
            role,
            content,
        });
    } catch (error) {
        logger.error('Failed to log chat message:', error);
    }
};

/**
 * Get chat history for a session
 */
const getChatHistory = async (sessionId, userId = null) => {
    const where = { session_id: sessionId };

    const messages = await ChatLog.findAll({
        where,
        order: [['created_at', 'ASC']],
        attributes: ['role', 'content', 'created_at'],
    });

    return messages;
};

/**
 * Check AI service health (now always healthy since it's local)
 */
const checkHealth = async () => {
    const engine = getEngine();
    return {
        healthy: true,
        service: 'integrated',
        mode: engine.mode,
        has_api: engine.hasApi,
    };
};

module.exports = {
    getPersona,
    getGreeting,
    chat,
    getChatHistory,
    checkHealth,
};
