const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/models');

async function test() {
  try {
    await db.testConnection();
    console.log('Connected to DB');

    // Force alter the section column to VARCHAR(50)
    console.log('Querying existing column type...');
    const result = await db.sequelize.query(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'banners' AND column_name = 'section';
    `);
    console.log('Column info:', result[0]);

    console.log('Attempting to alter column to VARCHAR(50)...');
    try {
        await db.sequelize.query(`ALTER TABLE "banners" ALTER COLUMN "section" TYPE VARCHAR(50) USING "section"::varchar;`);
        console.log('Successfully altered column type!');
    } catch (e) {
        console.error('Failed to alter column:', e.message);
    }
    
    // Test insert
    console.log('Testing insert...');
    const banner = await db.Banner.create({
      title: 'Test',
      image_url: 'https://test.com',
      section: 'homepage_categories'
    });
    console.log('Inserted successfully!', banner.id);
    await banner.destroy();
    
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

test();
