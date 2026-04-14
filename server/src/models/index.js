/**
 * Sequelize Models Index
 * AURA ARCHIVE - Initialize all models and relationships
 */

const { Sequelize } = require('sequelize');
const config = require('../config/db.config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize
let sequelize;

if (dbConfig.use_env_variable) {
    // Use DATABASE_URL (Render, Railway, Heroku, etc.)
    sequelize = new Sequelize(process.env[dbConfig.use_env_variable], {
        dialect: dbConfig.dialect,
        logging: dbConfig.logging,
        define: dbConfig.define,
        pool: dbConfig.pool,
        dialectOptions: dbConfig.dialectOptions,
    });
} else {
    sequelize = new Sequelize(
        dbConfig.database,
        dbConfig.username,
        dbConfig.password,
        {
            host: dbConfig.host,
            port: dbConfig.port,
            dialect: dbConfig.dialect,
            logging: dbConfig.logging,
            define: dbConfig.define,
            pool: dbConfig.pool,
            dialectOptions: dbConfig.dialectOptions,
        }
    );
}

// Initialize models
const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./user.model')(sequelize, Sequelize.DataTypes);
db.Product = require('./product.model')(sequelize, Sequelize.DataTypes);
db.Variant = require('./variant.model')(sequelize, Sequelize.DataTypes);
db.Order = require('./order.model')(sequelize, Sequelize.DataTypes);
db.OrderItem = require('./order-item.model')(sequelize, Sequelize.DataTypes);
db.SystemPrompt = require('./system-prompt.model')(sequelize, Sequelize.DataTypes);
db.ChatLog = require('./chat-log.model')(sequelize, Sequelize.DataTypes);
db.Wishlist = require('./wishlist.model')(sequelize, Sequelize.DataTypes);
db.Newsletter = require('./newsletter.model')(sequelize, Sequelize.DataTypes);
db.Review = require('./review.model')(sequelize, Sequelize.DataTypes);
db.Coupon = require('./coupon.model')(sequelize, Sequelize.DataTypes);
db.CouponUsage = require('./coupon-usage.model')(sequelize, Sequelize.DataTypes);
db.CouponAssignment = require('./coupon-assignment.model')(sequelize, Sequelize.DataTypes);
db.Address = require('./address.model')(sequelize, Sequelize.DataTypes);
db.Banner = require('./banner.model')(sequelize, Sequelize.DataTypes);
db.Blog = require('./blog.model')(sequelize, Sequelize.DataTypes);
db.SiteSettings = require('./site-settings.model')(sequelize, Sequelize.DataTypes);
db.Popup = require('./popup.model')(sequelize, Sequelize.DataTypes);
db.AbandonedCart = require('./abandoned-cart.model')(sequelize, Sequelize.DataTypes);
db.ChatSession = require('./chat-session.model')(sequelize, Sequelize.DataTypes);
db.Notification = require('./notification.model')(sequelize, Sequelize.DataTypes);
db.PageContent = require('./page-content.model')(sequelize, Sequelize.DataTypes);

// Set up associations
Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

// Test database connection
db.testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✓ Database connection established successfully.');
        return true;
    } catch (error) {
        console.error('✗ Unable to connect to database:', error.message);
        return false;
    }
};

// Sync database (use with caution in production)
db.syncDatabase = async (options = {}) => {
    try {
        await sequelize.sync(options);
        console.log('✓ Database synchronized successfully.');
        return true;
    } catch (error) {
        console.error('✗ Database synchronization failed:', error.message);
        return false;
    }
};

module.exports = db;
