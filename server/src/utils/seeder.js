/**
 * Database Seeder
 * AURA ARCHIVE - Populate database with fake data for testing
 */

const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const db = require('../models');

// Luxury fashion brands and items
const LUXURY_BRANDS = [
    'Rick Owens', 'Acronym', 'Comme des Garçons', 'Yohji Yamamoto', 'Issey Miyake',
    'Maison Margiela', 'Raf Simons', 'Balenciaga', 'Vetements', 'Off-White',
    'Fear of God', 'Undercover', 'Visvim', 'Number (N)ine', 'Julius',
    'Ann Demeulemeester', 'Dries Van Noten', 'Haider Ackermann', 'The Row', 'Lemaire'
];

const PRODUCT_TEMPLATES = [
    { name: 'Geobasket Sneakers', category: 'Shoes', basePrice: 30000000 },
    { name: 'Bomber Jacket', category: 'Outerwear', basePrice: 62500000 },
    { name: 'Draped Trousers', category: 'Pants', basePrice: 20000000 },
    { name: 'Oversized Hoodie', category: 'Tops', basePrice: 15000000 },
    { name: 'Leather Tote Bag', category: 'Bags', basePrice: 37500000 },
    { name: 'Wool Overcoat', category: 'Outerwear', basePrice: 75000000 },
    { name: 'Silk Shirt', category: 'Tops', basePrice: 11250000 },
    { name: 'Wide-Leg Trousers', category: 'Pants', basePrice: 17500000 },
    { name: 'Platform Boots', category: 'Shoes', basePrice: 35000000 },
    { name: 'Crossbody Bag', category: 'Bags', basePrice: 22500000 },
    { name: 'Deconstructed Blazer', category: 'Outerwear', basePrice: 45000000 },
    { name: 'Knit Sweater', category: 'Tops', basePrice: 13750000 },
    { name: 'Technical Pants', category: 'Pants', basePrice: 23750000 },
    { name: 'Gore-Tex Jacket', category: 'Outerwear', basePrice: 55000000 },
    { name: 'Backpack', category: 'Bags', basePrice: 27500000 },
    { name: 'Canvas Sneakers', category: 'Shoes', basePrice: 12500000 },
    { name: 'Asymmetric Dress', category: 'Dresses', basePrice: 32500000 },
    { name: 'Cashmere Cardigan', category: 'Tops', basePrice: 20000000 },
    { name: 'Cargo Pants', category: 'Pants', basePrice: 16250000 },
    { name: 'Leather Belt', category: 'Accessories', basePrice: 8750000 },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const COLORS = ['Black', 'White', 'Grey', 'Navy', 'Olive', 'Burgundy', 'Cream', 'Brown'];
const CONDITIONS = ['10/10 - New', '9/10 - Like New', '8/10 - Excellent', '7/10 - Good'];

/**
 * Generate a unique SKU
 */
const generateSKU = (brand, index) => {
    const brandCode = brand.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const timestamp = Date.now().toString().slice(-6);
    return `${brandCode}-${timestamp}-${String(index).padStart(4, '0')}`;
};

/**
 * Generate slug from name
 */
const generateSlug = (brand, name) => {
    return `${brand}-${name}`.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

/**
 * Seed Users
 */
const seedUsers = async () => {
    console.log('🌱 Seeding users...');

    const salt = await bcrypt.genSalt(12);

    // Admin user
    const adminHash = await bcrypt.hash('admin123', salt);
    const admin = await db.User.create({
        email: 'admin@aura.com',
        password_hash: adminHash,
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN',
        is_active: true,
    });

    // Demo Customer user
    const userHash = await bcrypt.hash('123456', salt);
    const customer = await db.User.create({
        email: 'customer@aura.com',
        password_hash: userHash,
        first_name: 'Demo',
        last_name: 'Customer',
        role: 'CUSTOMER',
        is_active: true,
    });

    // 10 Random Customers
    const randomCustomers = [];
    for (let i = 0; i < 10; i++) {
        const randomHash = await bcrypt.hash('password123', salt);
        const randomCustomer = await db.User.create({
            email: faker.internet.email().toLowerCase(),
            password_hash: randomHash,
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
            phone: faker.phone.number({ style: 'national' }).slice(0, 15),
            role: 'CUSTOMER',
            is_active: true,
        });
        randomCustomers.push(randomCustomer);
    }

    console.log('✅ Created Admin: admin@aura.com / admin123');
    console.log('✅ Created Demo Customer: customer@aura.com / 123456');
    console.log(`✅ Created ${randomCustomers.length} random customers`);

    return { admin, customer, randomCustomers };
};

/**
 * Seed System Prompts
 */
const seedSystemPrompts = async () => {
    console.log('🌱 Seeding system prompts...');

    await db.SystemPrompt.create({
        key: 'STYLIST_PERSONA',
        name: 'AI Stylist Persona',
        content: `You are AURA, a sophisticated fashion stylist for AURA ARCHIVE, a luxury consignment platform.

Your aesthetic preferences:
- Minimalist and avant-garde designs
- Techwear and functional fashion
- Japanese designers and deconstructed silhouettes
- Quality materials and craftsmanship

Your communication style:
- Polite and concise
- Knowledgeable about fashion history and designers
- Helpful in finding the perfect piece
- Suggest styling tips and outfit combinations

Remember: Every piece tells a story. Help customers discover theirs.`,
        description: 'Main persona for the AI Stylist chatbot. Admin can edit this to change chatbot behavior.',
        is_active: true,
        version: 1,
    });

    await db.SystemPrompt.create({
        key: 'GREETING_MESSAGE',
        name: 'Greeting Message',
        content: 'Chào mừng bạn đến AURA ARCHIVE! Mình là AURA, stylist thời trang AI chuyên nghiệp. Mình có thể giúp gì cho bạn hôm nay?',
        description: 'Initial greeting message when user opens the chat.',
        is_active: true,
        version: 1,
    });

    await db.SystemPrompt.create({
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
        description: 'Chat widget appearance configuration (JSON). Controls chatbot name, description, and colors.',
        is_active: true,
        version: 1,
    });

    console.log('✅ Created system prompts');
};

/**
 * Seed Products with Variants
 */
const seedProducts = async () => {
    console.log('🌱 Seeding products...');

    const products = [];

    for (let i = 0; i < 20; i++) {
        const brand = LUXURY_BRANDS[i % LUXURY_BRANDS.length];
        const template = PRODUCT_TEMPLATES[i];
        const name = `${brand} ${template.name}`;
        const slug = generateSlug(brand, template.name) + `-${i + 1}`;

        // Random price variation
        const priceVariation = faker.number.float({ min: 0.8, max: 1.3, fractionDigits: 2 });
        const basePrice = Math.round(template.basePrice * priceVariation);

        // Create product
        const product = await db.Product.create({
            name,
            slug,
            brand,
            description: faker.commerce.productDescription() + ` ${faker.lorem.paragraph()}`,
            base_price: basePrice,
            sale_price: Math.random() > 0.7 ? Math.round(basePrice * 0.85) : null,
            category: template.category,
            subcategory: faker.helpers.arrayElement(['Men', 'Women', 'Unisex']),
            condition_text: faker.helpers.arrayElement(CONDITIONS),
            condition_description: faker.lorem.sentence(),
            authenticity_verified: true,
            images: JSON.stringify([
                `/images/products/product-${i + 1}-1.jpg`,
                `/images/products/product-${i + 1}-2.jpg`,
            ]),
            tags: JSON.stringify([brand.toLowerCase(), template.category.toLowerCase(), 'luxury']),
            is_featured: i < 4, // First 4 are featured
            is_active: true,
            view_count: faker.number.int({ min: 10, max: 500 }),
        });

        // Create exactly ONE variant per product (resell model)
        const isAvailable = Math.random() > 0.2; // 80% available, 20% sold

        await db.Variant.create({
            product_id: product.id,
            sku: generateSKU(brand, i + 1),
            size: faker.helpers.arrayElement(SIZES),
            color: faker.helpers.arrayElement(COLORS),
            material: faker.helpers.arrayElement(['Leather', 'Cotton', 'Wool', 'Nylon', 'Silk', 'Cashmere']),
            price_adjustment: 0,
            status: isAvailable ? 'AVAILABLE' : 'SOLD',
            sold_at: isAvailable ? null : faker.date.recent({ days: 30 }),
        });

        products.push(product);
    }

    console.log(`✅ Created ${products.length} products with variants`);
    return products;
};

/**
 * Seed Orders
 */
const seedOrders = async (customer, products) => {
    console.log('🌱 Seeding orders...');

    const orders = [];
    const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const paymentMethods = ['COD', 'BANK_TRANSFER', 'CREDIT_CARD', 'MOMO', 'VNPAY'];

    for (let i = 0; i < 50; i++) {
        // Random date in last 12 months
        const orderDate = faker.date.between({
            from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            to: new Date(),
        });

        const status = faker.helpers.arrayElement(statuses);
        const paymentStatus = status === 'DELIVERED' ? 'PAID' :
            status === 'CANCELLED' ? 'REFUNDED' :
                faker.helpers.arrayElement(['PENDING', 'PAID']);

        // Random product for order
        const product = faker.helpers.arrayElement(products);
        const price = parseFloat(product.sale_price || product.base_price);
        const shippingFee = faker.helpers.arrayElement([0, 30000, 50000]);

        const order = await db.Order.create({
            user_id: customer.id,
            status,
            subtotal: price,
            shipping_fee: shippingFee,
            discount_amount: 0,
            shipping_discount_amount: 0,
            total_amount: price + shippingFee,
            payment_method: faker.helpers.arrayElement(paymentMethods),
            payment_status: paymentStatus,
            shipping_address: JSON.stringify({
                fullName: faker.person.fullName(),
                phone: faker.phone.number(),
                address: faker.location.streetAddress(),
                city: faker.helpers.arrayElement(['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ']),
                district: faker.location.county(),
                ward: faker.location.street(),
                notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
            }),
            confirmed_at: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status) ? orderDate : null,
            shipped_at: ['SHIPPED', 'DELIVERED'].includes(status) ? faker.date.soon({ days: 3, refDate: orderDate }) : null,
            delivered_at: status === 'DELIVERED' ? faker.date.soon({ days: 7, refDate: orderDate }) : null,
            created_at: orderDate,
            updated_at: orderDate,
        });

        orders.push(order);
    }

    console.log(`✅ Created ${orders.length} orders`);
    return orders;
};

/**
 * Main seeder function
 */
const seed = async () => {
    console.log('\n🚀 Starting database seeding...\n');

    try {
        // Sync database (create tables)
        await db.sequelize.sync({ force: true });
        console.log('✅ Database synchronized (tables recreated)\n');

        // Seed data
        const { customer } = await seedUsers();
        await seedSystemPrompts();
        const products = await seedProducts();
        await seedOrders(customer, products);

        console.log('\n🎉 Database seeding completed successfully!\n');
        console.log('='.repeat(50));
        console.log('📋 Summary:');
        console.log('   - 12 Users (1 Admin, 1 Demo Customer, 10 Random)');
        console.log('   - 2 System Prompts');
        console.log('   - 20 Products with Variants');
        console.log('   - 50 Orders');
        console.log('='.repeat(50));
        console.log('\n🔐 Login credentials:');
        console.log('   Admin:    admin@aura.com / admin123');
        console.log('   Customer: customer@aura.com / 123456\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

// Run seeder if called directly
if (require.main === module) {
    seed();
}

module.exports = { seed };
