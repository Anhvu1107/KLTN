const { Server } = require('socket.io');
const logger = require('./utils/logger');

let io = null;

const getAllowedOrigins = () => {
    const origins = [
        (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, ''),
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
    ].filter(Boolean);
    return origins;
};

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    const origins = getAllowedOrigins();
    if (origins.some(allowed => origin === allowed || origin === allowed.replace(/\/$/, ''))) return true;
    if (/\.vercel\.app$/.test(origin)) return true;
    return false;
};

/**
 * Initialize Socket.io with the HTTP server
 */
const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (isAllowedOrigin(origin)) return callback(null, true);
                callback(new Error('Not allowed by CORS'));
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        logger.info(`[Socket] Client connected: ${socket.id}`);

        // Client joins their chat session room
        socket.on('join-session', (sessionId) => {
            socket.join(`session:${sessionId}`);
            logger.info(`[Socket] ${socket.id} joined session:${sessionId}`);
        });

        // Admin joins the admin room to receive all updates
        socket.on('join-admin', () => {
            socket.join('admin-room');
            logger.info(`[Socket] ${socket.id} joined admin-room`);
        });

        socket.on('disconnect', () => {
            logger.info(`[Socket] Client disconnected: ${socket.id}`);
        });
    });

    logger.info('[Socket] Socket.io initialized');
    return io;
};

/**
 * Get the Socket.io instance
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initSocket first.');
    }
    return io;
};

/**
 * Emit a new message to a specific session room
 * Called when user sends a message or admin sends a message
 */
const emitNewMessage = (sessionId, message) => {
    if (!io) return;
    io.to(`session:${sessionId}`).emit('new-message', {
        sessionId,
        message,
    });
    // Also notify admin room
    io.to('admin-room').emit('new-message', {
        sessionId,
        message,
    });
};

/**
 * Emit session update to admin room
 * Called when session stats change (new message, read status, etc.)
 */
const emitSessionUpdate = (session) => {
    if (!io) return;
    io.to('admin-room').emit('session-updated', session);
};

module.exports = {
    initSocket,
    getIO,
    emitNewMessage,
    emitSessionUpdate,
};
