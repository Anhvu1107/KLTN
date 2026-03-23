/**
 * AURA ARCHIVE - Server Entry Point
 * Luxury Resell Fashion E-commerce Platform
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');

const routes = require('./src/routes');
const db = require('./src/models');
const { errorHandler, notFound } = require('./src/middlewares/error.middleware');
const logger = require('./src/utils/logger');
const { initSocket } = require('./src/socket');

// Initialize Express app
const app = express();

// ===========================================
// SECURITY MIDDLEWARES
// ===========================================

// Helmet - Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting - relaxed in development
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit in dev
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
    skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in dev
});
app.use('/api/', limiter);

// STRICT Rate limiting for auth endpoints - NEVER skipped (prevents brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Only 10 attempts per 15 minutes
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // DO NOT skip in development - security should always be tested
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);

// ===========================================
// BODY PARSING MIDDLEWARES
// ===========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// LOGGING
// ===========================================

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ===========================================
// STATIC FILES
// ===========================================

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===========================================
// API ROUTES
// ===========================================

app.use('/api/v1', routes);

// Welcome route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to AURA ARCHIVE API',
        version: '1.0.0',
        docs: '/api/v1/health',
    });
});

// ===========================================
// ERROR HANDLING
// ===========================================

app.use(notFound);
app.use(errorHandler);

// ===========================================
// SERVER STARTUP
// ===========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Test database connection
        const isConnected = await db.testConnection();

        if (!isConnected) {
            logger.error('Failed to connect to database. Exiting...');
            process.exit(1);
        }

        // Sync database in development (creates tables if not exist)
        if (process.env.NODE_ENV === 'development') {
            // Add PAYPAL to payment_method enum (PostgreSQL doesn't auto-add enum values)
            try {
                await db.sequelize.query(
                    `ALTER TYPE "enum_orders_payment_method" ADD VALUE IF NOT EXISTS 'PAYPAL';`
                );
            } catch (enumErr) {
                // Ignore if already exists or enum doesn't exist yet
            }

            await db.syncDatabase({ alter: true });
        }

        // Auto-seed default settings (creates missing settings, won't overwrite existing)
        try {
            const siteSettingsService = require('./src/services/site-settings.service');
            await siteSettingsService.seedDefaultSettings();
            logger.info('Default settings seeded successfully');
        } catch (seedError) {
            logger.warn('Failed to seed default settings:', seedError.message);
        }

        // Create HTTP server and attach Socket.io
        const httpServer = http.createServer(app);
        const io = initSocket(httpServer);

        // Store references for graceful shutdown
        app.set('server', httpServer);
        app.set('io', io);

        // Start server
        httpServer.listen(PORT, () => {
            logger.info(`
========================================
  AURA ARCHIVE Server Started
========================================
  Environment: ${process.env.NODE_ENV || 'development'}
  Port: ${PORT}
  API: http://localhost:${PORT}/api/v1
  WebSocket: Enabled (Socket.io)
  Health: http://localhost:${PORT}/api/v1/health
========================================
      `);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle unhandled promise rejections (don't crash — just log)
process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
    // Don't exit — let the server continue running
});

// Handle uncaught exceptions (graceful shutdown only for fatal errors)
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION!', err);
    // Give time to log, then exit gracefully
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Graceful shutdown — close Socket.io, HTTP server, and DB pool
const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    const server = app.get('server');
    const io = app.get('io');

    // Close Socket.io connections first
    if (io) {
        io.close(() => {
            logger.info('[Socket] All connections closed');
        });
    }

    // Close HTTP server
    if (server) {
        server.close(async () => {
            logger.info('[Server] HTTP server closed');
            // Close database pool
            try {
                await db.sequelize.close();
                logger.info('[DB] Connection pool closed');
            } catch (err) {
                logger.error('[DB] Error closing pool:', err.message);
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
        logger.error('Graceful shutdown timed out. Forcing exit.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
