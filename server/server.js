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
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const http = require('http');


const routes = require('./src/routes');
const db = require('./src/models');
const { errorHandler, notFound } = require('./src/middlewares/error.middleware');
const logger = require('./src/utils/logger');
const ensureCouponSchema = require('./src/utils/ensure-coupon-schema');
const { initSocket } = require('./src/socket');
const { buildOpenApiSpec, normalizeDocsScope } = require('./src/docs/openapi');

// Initialize Express app
const app = express();
const docsMode = normalizeDocsScope(process.env.API_DOCS_MODE || 'full');
const docsEnabled = docsMode !== 'off';
const docsTryItOutEnabled = process.env.API_DOCS_TRY_IT_OUT !== 'false';

// ===========================================
// SECURITY MIDDLEWARES
// ===========================================

// Helmet - Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
    (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, ''),
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
].filter(Boolean);

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.some(allowed => origin === allowed || origin === allowed.replace(/\/$/, ''))) return true;
    if (/\.vercel\.app$/.test(origin)) return true;
    return false;
};

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting - relaxed for normal usage
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 5000 : 2000, // ~2 req/s is reasonable
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (_req) => process.env.NODE_ENV === 'development', // Skip rate limiting in dev
});
app.use('/api/', limiter);

// STRICT Rate limiting for auth endpoints - NEVER skipped (prevents brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 attempts per 15 minutes
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

app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// ===========================================
// HEALTH CHECK (for cron-job.org ping)
// ===========================================

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'AURA ARCHIVE Server is running',
        ai_status: 'integrated',
        timestamp: new Date().toISOString(),
    });
});

// ===========================================
// API DOCUMENTATION
// ===========================================

if (docsEnabled) {
    app.get('/openapi.json', (req, res) => {
        res.json(buildOpenApiSpec(req, { scope: docsMode }));
    });

    app.use(
        '/docs',
        swaggerUi.serve,
        swaggerUi.setup(null, {
            explorer: true,
            customSiteTitle: 'AURA ARCHIVE API Docs',
            swaggerOptions: {
                url: '/openapi.json',
                supportedSubmitMethods: docsTryItOutEnabled ? undefined : [],
            },
        })
    );
}

// ===========================================
// API ROUTES
// ===========================================

app.use('/api/v1', routes);

// Welcome route
app.get('/', (req, res) => {
    const payload = {
        success: true,
        message: 'Welcome to AURA ARCHIVE API',
        version: '1.0.0',
        docs_mode: docsMode,
    };

    if (docsEnabled) {
        payload.docs = '/docs';
        payload.openapi = '/openapi.json';
    }

    res.json(payload);
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

        await ensureCouponSchema(db, logger);

        // Sync database in development (creates tables if not exist)
        if (process.env.NODE_ENV === 'development') {
            // Add PAYPAL to payment_method enum (PostgreSQL doesn't auto-add enum values)
            try {
                await db.sequelize.query(
                    `ALTER TYPE "enum_orders_payment_method" ADD VALUE IF NOT EXISTS 'PAYPAL';`
                );
            } catch {
                // Ignore if already exists or enum doesn't exist yet
            }

            await db.syncDatabase({ alter: true });
        }

        // Production: sync tables (create if not exist)
        if (process.env.NODE_ENV === 'production') {
            await db.syncDatabase({ alter: true });
            logger.info('Database synced for production');

            // Auto-seed if database is empty (no users found)
            try {
                const userCount = await db.User.count();
                if (userCount === 0) {
                    logger.info('Empty database detected — auto-seeding admin user...');
                    const bcrypt = require('bcryptjs');
                    const salt = await bcrypt.genSalt(12);

                    // Create admin
                    await db.User.create({
                        email: 'admin@aura.com',
                        password_hash: await bcrypt.hash('admin123', salt),
                        first_name: 'Admin',
                        last_name: 'User',
                        role: 'ADMIN',
                        is_active: true,
                    });

                    // Create demo customer
                    await db.User.create({
                        email: 'customer@aura.com',
                        password_hash: await bcrypt.hash('123456', salt),
                        first_name: 'Demo',
                        last_name: 'Customer',
                        role: 'CUSTOMER',
                        is_active: true,
                    });

                    // Create system prompts
                    await db.SystemPrompt.bulkCreate([
                        {
                            key: 'STYLIST_PERSONA',
                            name: 'AI Stylist Persona',
                            content: 'You are AURA, a sophisticated fashion stylist for AURA ARCHIVE, a luxury consignment platform.',
                            description: 'Main persona for the AI Stylist chatbot.',
                            is_active: true,
                            version: 1,
                        },
                        {
                            key: 'GREETING_MESSAGE',
                            name: 'Greeting Message',
                            content: 'Chào mừng bạn đến AURA ARCHIVE! Mình là AURA, stylist thời trang AI. Mình có thể giúp gì cho bạn?',
                            description: 'Initial greeting message.',
                            is_active: true,
                            version: 1,
                        },
                        {
                            key: 'CHAT_APPEARANCE',
                            name: 'Chat Appearance',
                            content: JSON.stringify({
                                chatName: 'AURA Stylist',
                                chatDescription: 'Trợ lý thời trang của bạn',
                                avatarUrl: '',
                                headerBgColor: '#1a1a1a',
                                headerTextColor: '#ffffff',
                                botBgColor: '#f5f5f5',
                                botTextColor: '#262626',
                                userBgColor: '#1a1a1a',
                                userTextColor: '#ffffff',
                            }),
                            description: 'Chat widget appearance.',
                            is_active: true,
                            version: 1,
                        },
                    ]);

                    logger.info('✅ Auto-seed complete: admin@aura.com / admin123');
                }
            } catch (seedErr) {
                logger.warn('Auto-seed failed (non-fatal):', seedErr.message);
            }
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
