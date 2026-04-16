/**
 * Chat Admin Service
 * AURA ARCHIVE - Business logic for admin chat management
 */

const { ChatLog, ChatSession, User } = require('../models');
const { Op, fn, col } = require('sequelize');
const AppError = require('../utils/AppError');
const { emitNewMessage } = require('../socket');

/**
 * Ensure a ChatSession record exists for a given session_id.
 * Auto-creates from ChatLog data if missing.
 */
const ensureSession = async (sessionId) => {
    let session = await ChatSession.findOne({ where: { session_id: sessionId } });

    if (!session) {
        // Build from ChatLog data
        const firstLog = await ChatLog.findOne({
            where: { session_id: sessionId },
            order: [['created_at', 'ASC']],
        });
        const lastLog = await ChatLog.findOne({
            where: { session_id: sessionId },
            order: [['created_at', 'DESC']],
        });
        const count = await ChatLog.count({ where: { session_id: sessionId } });

        session = await ChatSession.create({
            session_id: sessionId,
            user_id: firstLog?.user_id || null,
            last_message: lastLog?.content?.substring(0, 200) || '',
            last_activity: lastLog?.created_at || new Date(),
            message_count: count,
        });
    }

    return session;
};

/**
 * Get all chat sessions for admin list view
 */
const getSessions = async (options = {}) => {
    const { page = 1, limit = 30, search, filter } = options;
    const offset = (page - 1) * limit;

    const where = {};

    // Filter by tab
    if (filter === 'unread') {
        where.is_read = false;
        where.status = 'active';
    } else if (filter === 'joined') {
        where.admin_joined = true;
        where.status = 'active';
    } else if (filter === 'closed') {
        where.status = 'closed';
    } else if (filter === 'paused') {
        where.is_ai_paused = true;
        where.status = 'active';
    } else {
        // Default: show only active sessions
        where.status = 'active';
    }

    // Search
    if (search) {
        where[Op.or] = [
            { customer_name: { [Op.iLike]: `%${search}%` } },
            { customer_email: { [Op.iLike]: `%${search}%` } },
            { last_message: { [Op.iLike]: `%${search}%` } },
            { '$user.first_name$': { [Op.iLike]: `%${search}%` } },
            { '$user.last_name$': { [Op.iLike]: `%${search}%` } },
        ];
    }

    const { count, rows } = await ChatSession.findAndCountAll({
        where,
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name', 'avatar_url', 'phone', 'address'],
            required: false,
        }],
        order: [['last_activity', 'DESC']],
        limit,
        offset,
    });

    return {
        sessions: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    };
};

/**
 * Sync sessions from ChatLog if ChatSession table is empty.
 * Called once on first admin visit to populate session list.
 */
const syncSessionsFromLogs = async () => {
    const sessionCount = await ChatSession.count();
    if (sessionCount > 0) return; // Already populated

    // Group chat logs by session_id
    const sessions = await ChatLog.findAll({
        attributes: [
            'session_id',
            'user_id',
            [fn('COUNT', col('id')), 'msg_count'],
            [fn('MAX', col('created_at')), 'last_at'],
        ],
        group: ['session_id', 'user_id'],
        raw: true,
    });

    for (const s of sessions) {
        const lastMsg = await ChatLog.findOne({
            where: { session_id: s.session_id },
            order: [['created_at', 'DESC']],
            attributes: ['content'],
            raw: true,
        });

        await ChatSession.findOrCreate({
            where: { session_id: s.session_id },
            defaults: {
                user_id: s.user_id,
                last_message: lastMsg?.content?.substring(0, 200) || '',
                last_activity: s.last_at,
                message_count: parseInt(s.msg_count) || 0,
            },
        });
    }
};

/**
 * Get messages for a specific session + auto mark as read
 */
const getSessionMessages = async (sessionId) => {
    const messages = await ChatLog.findAll({
        where: { session_id: sessionId },
        order: [['created_at', 'ASC']],
        attributes: ['id', 'role', 'content', 'metadata', 'tokens_used', 'created_at'],
    });

    // Auto mark read
    await ChatSession.update(
        { is_read: true },
        { where: { session_id: sessionId } }
    );

    // Get session info with user data
    const session = await ensureSession(sessionId);
    // Re-fetch with user include for customer panel
    const sessionWithUser = await ChatSession.findOne({
        where: { session_id: sessionId },
        include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name', 'avatar_url', 'phone', 'address'],
            required: false,
        }],
    });

    return { messages, session: sessionWithUser || session };
};

/**
 * Mark session as read
 */
const markRead = async (sessionId) => {
    const session = await ensureSession(sessionId);
    await session.update({ is_read: true });
    return session;
};

/**
 * Toggle AI pause for a session
 */
const toggleAiPause = async (sessionId) => {
    const session = await ensureSession(sessionId);
    await session.update({ is_ai_paused: !session.is_ai_paused });
    return session;
};

/**
 * Admin joins a chat room
 */
const joinRoom = async (sessionId) => {
    const session = await ensureSession(sessionId);
    await session.update({ admin_joined: true });
    return session;
};

/**
 * Admin leaves a chat room
 */
const leaveRoom = async (sessionId) => {
    const session = await ensureSession(sessionId);
    await session.update({ admin_joined: false });
    return session;
};

/**
 * Save customer info and admin notes
 */
const saveCustomerInfo = async (sessionId, data) => {
    const session = await ensureSession(sessionId);

    const updateData = {};
    if (data.customer_name !== undefined) updateData.customer_name = data.customer_name;
    if (data.customer_email !== undefined) updateData.customer_email = data.customer_email;
    if (data.customer_phone !== undefined) updateData.customer_phone = data.customer_phone;
    if (data.customer_address !== undefined) updateData.customer_address = data.customer_address;
    if (data.customer_year !== undefined) updateData.customer_year = data.customer_year;
    if (data.admin_note !== undefined) updateData.admin_note = data.admin_note;

    await session.update(updateData);
    return session;
};

/**
 * Search messages within a session
 */
const searchMessages = async (sessionId, query) => {
    if (!query || !query.trim()) return [];

    const messages = await ChatLog.findAll({
        where: {
            session_id: sessionId,
            content: { [Op.iLike]: `%${query}%` },
        },
        order: [['created_at', 'ASC']],
        attributes: ['id', 'role', 'content', 'created_at'],
    });

    return messages;
};

/**
 * Check if AI is paused for a session
 */
const isAiPaused = async (sessionId) => {
    const session = await ChatSession.findOne({
        where: { session_id: sessionId },
    });
    return session?.is_ai_paused || false;
};

/**
 * Update session stats after new message
 * Called from ai.service.js after logging a message
 */
const updateSessionStats = async (sessionId, lastMessage, userId = null) => {
    const [session] = await ChatSession.findOrCreate({
        where: { session_id: sessionId },
        defaults: {
            user_id: userId,
            last_message: lastMessage?.substring(0, 200) || '',
            last_activity: new Date(),
            message_count: 1,
        },
    });

    if (session) {
        await session.update({
            last_message: lastMessage?.substring(0, 200) || session.last_message,
            last_activity: new Date(),
            message_count: session.message_count + 1,
            is_read: false, // New message = unread
        });
    }
};

/**
 * Admin sends a message in a chat session
 */
const sendAdminMessage = async (sessionId, content) => {
    const session = await ensureSession(sessionId);

    // Save as ASSISTANT role (admin speaks for the system)
    const message = await ChatLog.create({
        session_id: sessionId,
        user_id: null,
        role: 'ASSISTANT',
        content,
    });

    // Update session stats
    await session.update({
        last_message: content.substring(0, 200),
        last_activity: new Date(),
        message_count: session.message_count + 1,
    });

    // Emit real-time event
    emitNewMessage(sessionId, {
        role: 'ASSISTANT',
        content,
        created_at: message.created_at,
    });

    return message;
};

/**
 * Close a chat session
 */
const closeSession = async (sessionId) => {
    const session = await ensureSession(sessionId);
    await session.update({
        status: 'closed',
        admin_joined: false,
        is_ai_paused: false,
    });
    return session;
};

/**
 * Reopen a closed chat session
 */
const reopenSession = async (sessionId) => {
    const session = await ensureSession(sessionId);
    await session.update({ status: 'active' });
    return session;
};

/**
 * Auto-archive sessions inactive for more than 30 days
 */
const autoArchiveOldSessions = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [count] = await ChatSession.update(
        { status: 'closed' },
        {
            where: {
                status: 'active',
                last_activity: { [Op.lt]: thirtyDaysAgo },
            },
        }
    );
    return count;
};

const deleteSession = async (sessionId) => {
    // Delete logs first due to possible foreign key constraints
    await ChatLog.destroy({ where: { session_id: sessionId } });
    // Delete session
    const deleted = await ChatSession.destroy({ where: { session_id: sessionId } });
    if (!deleted) {
        throw new AppError('Session not found', 404);
    }
    return true;
};

module.exports = {
    getSessions,
    syncSessionsFromLogs,
    getSessionMessages,
    markRead,
    toggleAiPause,
    joinRoom,
    leaveRoom,
    saveCustomerInfo,
    searchMessages,
    isAiPaused,
    updateSessionStats,
    ensureSession,
    sendAdminMessage,
    closeSession,
    reopenSession,
    deleteSession,
    autoArchiveOldSessions,
};
