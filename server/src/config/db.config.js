/**
 * Database Configuration
 * AURA ARCHIVE - PostgreSQL with Sequelize ORM
 */

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
    development: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'aura_archive_dev',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        dialect: 'postgres',
        logging: console.log,
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true,
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    },
    test: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'aura_archive_test',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        dialect: 'postgres',
        logging: false,
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true,
        },
    },
    production: {
        ...(process.env.DATABASE_URL
            ? {
                // Use DATABASE_URL if available (Render, Railway, Heroku, etc.)
                use_env_variable: 'DATABASE_URL',
            }
            : {
                // Fallback to individual variables
                username: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                host: process.env.DB_HOST,
                port: parseInt(process.env.DB_PORT, 10) || 5432,
            }
        ),
        dialect: 'postgres',
        logging: false,
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true,
        },
        pool: {
            max: 5,          // Supabase free tier: keep connections low
            min: 0,          // Release ALL idle connections (saves resources)
            acquire: 30000,  // 30s timeout to acquire connection
            idle: 5000,      // Release idle connections after 5s
            evict: 10000,    // Check for idle connections every 10s
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        },
    },
};
