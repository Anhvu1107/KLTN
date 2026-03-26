const { Sequelize } = require('sequelize');

const DATABASE_URL = 'postgresql://neondb_owner:npg_P9Dh6yxBOtmA@ep-lingering-bread-a1fe3uhb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
    },
});

(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Neon connection successful!');
        
        console.log('Adding section column to banners table...');
        
        await sequelize.query(`
            ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "section" VARCHAR(50) DEFAULT 'general' NOT NULL;
        `);
        console.log('✅ Column added successfully!');

    } catch (error) {
        console.error('❌ Alter failed:', error.message);
    } finally {
        await sequelize.close();
    }
})();
