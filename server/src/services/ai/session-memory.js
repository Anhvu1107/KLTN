/**
 * Shared Session Memory
 * AURA ARCHIVE - Reusable in-memory session store for text + voice AI flows
 */

const SESSION_TTL = 30 * 60 * 1000;

const sessions = new Map();

const createSession = () => ({
    messages: [],
    context: {},
    salesState: {
        stage: 'greeting',
        next_action: 'welcome_customer',
        objections: [],
        buying_signals: [],
        last_recommended_slugs: [],
        last_recommended_product_ids: [],
        confidence_level: 'warm',
        last_tool_action: null,
    },
    lastAccess: Date.now(),
});

const ensureSession = (sessionId) => {
    if (!sessionId) {
        return createSession();
    }

    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, createSession());
    }

    const session = sessions.get(sessionId);
    session.lastAccess = Date.now();
    return session;
};

const getSession = (sessionId) => {
    if (!sessionId || !sessions.has(sessionId)) {
        return null;
    }

    const session = sessions.get(sessionId);
    session.lastAccess = Date.now();
    return session;
};

const mergeContext = (sessionId, patch = {}) => {
    const session = ensureSession(sessionId);
    session.context = { ...(session.context || {}), ...patch };
    session.lastAccess = Date.now();
    return session;
};

const appendMessage = (sessionId, message) => {
    const session = ensureSession(sessionId);
    session.messages.push(message);
    session.lastAccess = Date.now();
    return session;
};

const updateSalesState = (sessionId, patch = {}) => {
    const session = ensureSession(sessionId);
    session.salesState = { ...(session.salesState || {}), ...patch };
    session.lastAccess = Date.now();
    return session;
};

const cleanupExpiredSessions = () => {
    const now = Date.now();
    const expired = [];

    for (const [sessionId, session] of sessions.entries()) {
        if (now - (session.lastAccess || 0) > SESSION_TTL) {
            expired.push(sessionId);
        }
    }

    for (const sessionId of expired) {
        sessions.delete(sessionId);
    }

    return expired.length;
};

module.exports = {
    sessions,
    SESSION_TTL,
    ensureSession,
    getSession,
    mergeContext,
    appendMessage,
    updateSalesState,
    cleanupExpiredSessions,
};
