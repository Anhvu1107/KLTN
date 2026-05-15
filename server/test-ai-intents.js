const assert = require('assert');

process.env.CHATBOT_MODE = 'trained_only';
process.env.GEMINI_API_KEY = '';
process.env.OPENAI_API_KEY = '';

const productSearch = require('./src/services/ai/product-search');
productSearch.searchProducts = async () => [];

const {
    classifyIntent,
    extractEntities,
} = require('./src/services/ai/intent-classifier');
const { StylistEngine } = require('./src/services/ai/stylist-engine');

(async () => {
    const shirtIntent = classifyIntent('tôi muốn mua áo');
    const shirtEntities = extractEntities('tôi muốn mua áo');
    assert.strictEqual(shirtIntent[0], 'PRODUCT_SEARCH');
    assert.strictEqual(shirtEntities.category, 'Tops');

    const browseIntent = classifyIntent('bạn có bán áo không');
    assert.notStrictEqual(browseIntent[0], 'CONSIGNMENT');

    const consignmentIntent = classifyIntent('tôi muốn bán áo');
    assert.strictEqual(consignmentIntent[0], 'CONSIGNMENT');

    const engine = new StylistEngine();
    const result = await engine.processMessage('tôi muốn mua áo', 'test-buy-shirt');
    assert.strictEqual(result.metadata.intent, 'DISCOVERY');
    assert.match(result.message, /áo|size|kiểu/i);
    assert.doesNotMatch(result.message, /Mình có thể giúp bạn mấy việc này/i);
    assert.doesNotMatch(result.message, /Chính sách Ký gửi/i);

    productSearch.searchProducts = async () => [
        {
            name: 'AURA Sample Shirt',
            brand: 'AURA',
            slug: 'aura-sample-shirt',
            category: 'Tops',
            base_price: 1500000,
            condition_text: '9/10',
            variants: [{ size: 'M', color: 'Black', status: 'AVAILABLE', stock_quantity: 1 }],
        },
    ];

    const productResult = await engine.processMessage('tôi muốn mua áo', 'test-buy-shirt-with-products');
    assert.strictEqual(productResult.metadata.intent, 'DISCOVERY');
    assert.match(productResult.message, /AURA Sample Shirt/);
    assert.match(productResult.message, /chiều cao/i);
    assert.match(productResult.message, /cân nặng/i);
    assert.match(productResult.message, /số đo/i);
    assert.match(productResult.message, /\/shop\/aura-sample-shirt/);

    console.log('[OK] AI intent regressions passed');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
