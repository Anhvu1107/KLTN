/**
 * AI Service
 * AURA ARCHIVE - Integrated AI Stylist running directly inside Node.js
 */

const { SystemPrompt, ChatLog } = require('../models');
const logger = require('../utils/logger');
const chatAdminService = require('./chat-admin.service');
const { emitNewMessage } = require('../socket');
const { getEngine } = require('./ai/stylist-engine');

const PROMPT_CACHE_TTL = 60 * 1000;
const DEFAULT_GREETING = 'Chào bạn! Mình là AURA, tư vấn thời trang bên AURA ARCHIVE. Bạn đang tìm món đồ nào, hay muốn mình gợi ý phong cách?';

const promptCache = {
    persona: { value: null, expiresAt: 0 },
    greeting: { value: null, expiresAt: 0 },
};

/**
 * Get the current AI persona from database.
 * Cached briefly to reduce one DB round-trip on every message.
 */
const getPersona = async () => {
    try {
        if (promptCache.persona.value && promptCache.persona.expiresAt > Date.now()) {
            return promptCache.persona.value;
        }

        const prompt = await SystemPrompt.findOne({
            where: { key: 'STYLIST_PERSONA', is_active: true },
        });

        const persona = prompt?.content || null;
        promptCache.persona = {
            value: persona,
            expiresAt: Date.now() + PROMPT_CACHE_TTL,
        };

        return persona;
    } catch (error) {
        logger.error('Failed to fetch AI persona:', error);
        return null;
    }
};

/**
 * Get greeting message.
 */
const getGreeting = async () => {
    try {
        if (promptCache.greeting.value && promptCache.greeting.expiresAt > Date.now()) {
            return promptCache.greeting.value;
        }

        const prompt = await SystemPrompt.findOne({
            where: { key: 'GREETING_MESSAGE', is_active: true },
        });

        const greeting = prompt?.content || DEFAULT_GREETING;
        promptCache.greeting = {
            value: greeting,
            expiresAt: Date.now() + PROMPT_CACHE_TTL,
        };

        return greeting;
    } catch {
        return DEFAULT_GREETING;
    }
};

/**
 * Send message to AI stylist.
 */
const chat = async (message, sessionId, userId = null, context = null) => {
    try {
        const isPaused = await chatAdminService.isAiPaused(sessionId);
        if (isPaused) {
            await logMessage(userId, sessionId, 'USER', message, { paused: true });
            await chatAdminService.updateSessionStats(sessionId, message, userId);
            emitNewMessage(sessionId, { role: 'USER', content: message });

            return {
                success: true,
                message: null,
                sessionId,
                metadata: { paused: true },
            };
        }

        const systemPrompt = await getPersona();
        const engine = getEngine();
        const aiResponse = await engine.processMessage(
            message,
            sessionId,
            userId,
            context,
            systemPrompt,
        );

        await logMessage(
            userId,
            sessionId,
            'USER',
            message,
            aiResponse.metadata?.user_context || {},
        );
        await logMessage(
            userId,
            sessionId,
            'ASSISTANT',
            aiResponse.message,
            aiResponse.metadata || {},
        );

        emitNewMessage(sessionId, { role: 'USER', content: message });
        emitNewMessage(sessionId, { role: 'ASSISTANT', content: aiResponse.message });

        await chatAdminService.updateSessionStats(sessionId, aiResponse.message, userId);

        return {
            success: true,
            message: aiResponse.message,
            sessionId,
            metadata: aiResponse.metadata,
        };
    } catch (error) {
        logger.error('AI Service Error:', error.message);

        const fallbackMessage = 'Xin lỗi, mình đang gặp chút trục trặc. Bạn thử nhắn lại sau một chút nha!';
        try {
            await logMessage(userId, sessionId, 'USER', message, { failed: true });
            await logMessage(userId, sessionId, 'ASSISTANT', fallbackMessage, { failed: true });
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
 * Log chat message to database.
 */
const logMessage = async (userId, sessionId, role, content, metadata = {}) => {
    try {
        await ChatLog.create({
            user_id: userId,
            session_id: sessionId,
            role,
            content,
            metadata,
        });
    } catch (error) {
        logger.error('Failed to log chat message:', error);
    }
};

/**
 * Get chat history for a session.
 */
const getChatHistory = async (sessionId, _userId = null) => {
    const where = { session_id: sessionId };

    const messages = await ChatLog.findAll({
        where,
        order: [['created_at', 'ASC']],
        attributes: ['role', 'content', 'created_at'],
    });

    return messages;
};

/**
 * Check AI service health.
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
