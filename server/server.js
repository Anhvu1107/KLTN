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

const routes = require('./src/routes');
const db = require('./src/models');
const { errorHandler, notFound } = require('./src/middlewares/error.middleware');
const logger = require('./src/utils/logger');

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

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
});
app.use('/api/', limiter);

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
            await db.syncDatabase({ alter: false });
        }

        // Start server
        app.listen(PORT, () => {
            logger.info(`
========================================
  AURA ARCHIVE Server Started
========================================
  Environment: ${process.env.NODE_ENV || 'development'}
  Port: ${PORT}
  API: http://localhost:${PORT}/api/v1
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

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! Shutting down...');
    logger.error(err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down...');
    logger.error(err);
    process.exit(1);
});

module.exports = app;
