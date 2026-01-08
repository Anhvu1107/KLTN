/**
 * AI Service
 * AURA ARCHIVE - Communication with Python AI service
 */

const axios = require('axios');
const { SystemPrompt, ChatLog } = require('../models');
const logger = require('../utils/logger');

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

        // Log the conversation
        if (userId) {
            await logMessage(userId, sessionId, 'user', message);
            await logMessage(userId, sessionId, 'assistant', aiResponse.message);
        }

        return {
            success: true,
            message: aiResponse.message,
            sessionId: aiResponse.session_id,
            metadata: aiResponse.metadata,
        };

    } catch (error) {
        logger.error('AI Service Error:', error.message);

        // Return fallback message
        return {
            success: false,
            message: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
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
    if (userId) {
        where.user_id = userId;
    }

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
