/**
 * AI Service
 * AURA ARCHIVE - Communication with Python AI service
 */

const axios = require('axios');
const { SystemPrompt, ChatLog, ChatSession } = require('../models');
const logger = require('../utils/logger');
const chatAdminService = require('./chat-admin.service');
const { emitNewMessage } = require('../socket');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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
        return prompt?.content || 'Welcome! How can I help you today?';
    } catch (error) {
        return 'Welcome! How can I help you today?';
    }
};

/**
 * Send message to AI service
 * @param {string} message - User message
 * @param {string} sessionId - Session ID for conversation continuity
 * @param {string} userId - Optional user ID
 * @param {object} context - Optional context (current product, etc.)
 */
const chat = async (message, sessionId, userId = null, context = null) => {
    try {
        // Check if AI is paused for this session
        const isPaused = await chatAdminService.isAiPaused(sessionId);
        if (isPaused) {
            // Log user message even when paused (admin will reply manually)
            await logMessage(userId, sessionId, 'USER', message);
            await chatAdminService.updateSessionStats(sessionId, message, userId);

            // Emit real-time event so admin sees the message immediately
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

        // Call Python AI service
        const response = await axios.post(`${AI_SERVICE_URL}/api/v1/chat`, {
            message,
            session_id: sessionId,
            user_id: userId,
            context,
            system_prompt: systemPrompt,
        }, {
            timeout: 30000, // 30 second timeout
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const aiResponse = response.data;

        // Log the conversation (always, including guests)
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
            sessionId: aiResponse.session_id,
            metadata: aiResponse.metadata,
        };

    } catch (error) {
        logger.error('AI Service Error:', error.message);

        // Still log the user message and update session even on error
        const fallbackMessage = "I apologize, but I'm having trouble connecting right now. Please try again in a moment.";
        try {
            await logMessage(userId, sessionId, 'USER', message);
            await logMessage(userId, sessionId, 'ASSISTANT', fallbackMessage);
            await chatAdminService.updateSessionStats(sessionId, message, userId);
        } catch (logError) {
            logger.error('Failed to log error chat:', logError.message);
        }

        // Return fallback message
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
    // Don't filter by user_id — admin messages have user_id: null
    // and should still appear in the chat history for all participants

    const messages = await ChatLog.findAll({
        where,
        order: [['created_at', 'ASC']],
        attributes: ['role', 'content', 'created_at'],
    });

    return messages;
};

/**
 * Check AI service health
 */
const checkHealth = async () => {
    try {
        const response = await axios.get(`${AI_SERVICE_URL}/health`, {
            timeout: 5000,
        });
        return response.data;
    } catch (error) {
        return { healthy: false, error: error.message };
    }
};

module.exports = {
    getPersona,
    getGreeting,
    chat,
    getChatHistory,
    checkHealth,
};
