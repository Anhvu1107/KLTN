/**
 * Voice Service
 * AURA ARCHIVE - Real-time voice AI using Gemini Live API
 * Handles session config and backend tool execution.
 */

const { SystemPrompt } = require('../models');
const productSearch = require('./ai/product-search');
const sessionMemory = require('./ai/session-memory');
const logger = require('../utils/logger');

const PROMPT_CACHE_TTL = 60 * 1000;
const promptCache = {
    persona: { value: null, expiresAt: 0 },
};

function extractFirstImage(images) {
    if (!images) return null;

    try {
        const parsed = typeof images === 'string' ? JSON.parse(images) : images;
        return Array.isArray(parsed) && parsed.length ? parsed[0] : null;
    } catch {
        return null;
    }
}

function buildSessionSnapshot(sessionId) {
    const session = sessionMemory.getSession(sessionId);
    if (!session) return '';

    const ctx = session.context || {};
    const sales = session.salesState || {};
    const parts = [];

    if (ctx.height_cm) parts.push(`Chiều cao: ${ctx.height_cm}cm`);
    if (ctx.weight_kg) parts.push(`Cân nặng: ${ctx.weight_kg}kg`);
    if (ctx.size) parts.push(`Size: ${ctx.size}`);
    if (ctx.style) parts.push(`Phong cách: ${Array.isArray(ctx.style) ? ctx.style.join(', ') : ctx.style}`);
    if (ctx.color) parts.push(`Màu thích: ${ctx.color}`);
    if (ctx.occasion) parts.push(`Dịp mặc: ${ctx.occasion}`);
    if (ctx.budget_label) parts.push(`Ngân sách: ${ctx.budget_label}`);
    if (ctx.brand) parts.push(`Brand quan tâm: ${ctx.brand}`);
    if (ctx.category) parts.push(`Danh mục quan tâm: ${ctx.category}`);

    const snapshot = [];
    if (parts.length) {
        snapshot.push(`Khách đã chia sẻ: ${parts.join(' | ')}`);
    }
    if (sales.last_recommended_slugs?.length) {
        snapshot.push(`Sản phẩm vừa gợi ý gần đây: ${sales.last_recommended_slugs.join(', ')}`);
    }

    return snapshot.length ? `\nTHÔNG TIN KHÁCH HÀNG:\n- ${snapshot.join('\n- ')}` : '';
}

async function getPersonaForVoice() {
    try {
        if (promptCache.persona.value && promptCache.persona.expiresAt > Date.now()) {
            return promptCache.persona.value;
        }

        const prompt = await SystemPrompt.findOne({
            where: { key: 'STYLIST_PERSONA', is_active: true },
        });

        const persona = prompt?.content || null;
        promptCache.persona = {
            value: persona,
            expiresAt: Date.now() + PROMPT_CACHE_TTL,
        };

        return persona;
    } catch (error) {
        logger.error('Failed to fetch AI persona for voice:', error);
        return null;
    }
}

/**
 * Build system prompt optimized for voice conversations.
 */
const buildVoiceSystemPrompt = async (sessionId = null) => {
    const persona = await getPersonaForVoice();
    const sessionSnapshot = buildSessionSnapshot(sessionId);

    const antiThinking = `BẮT BUỘC: Bạn PHẢI nói TRỰC TIẾP với khách hàng bằng tiếng Việt. KHÔNG BAO GIỜ được viết suy nghĩ nội bộ, giải thích quy trình, hay meta-commentary. Mọi output phải là lời nói tự nhiên dành cho khách. Ví dụ SAI: "Initiating the dialogue, I will greet...". Ví dụ ĐÚNG: "Chào bạn! Mình là AURA nè!".`;

    const basePrompt = persona || `Bạn là AURA — nhân viên tư vấn thời trang tại AURA ARCHIVE, shop đồ hiệu secondhand chính hãng.

Bạn là một NGƯỜI THẬT, không phải robot. Nói chuyện tự nhiên, ấm áp, có cảm xúc. Bạn hào hứng khi tìm được món đồ hay, cảm thông khi khách lăn tăn, và thành thật khi chưa tìm được thứ phù hợp.

Bạn giống một người bạn thân rành thời trang — thoải mái, vui vẻ, nhưng rất chuyên nghiệp khi tư vấn.`;

    const conversationGuidance = `

CÁCH BẠN NÓI CHUYỆN:
- Nói tự nhiên, gần gũi, như đang trò chuyện với bạn bè. Dùng "mình" và "bạn".
- Trả lời bằng tiếng Việt, trừ khi khách nói tiếng Anh.
- Mỗi lượt 1-3 câu ngắn gọn, đi vào trọng tâm. Không vòng vo.
- KHÔNG dùng markdown, emoji hay link. Khách đang nghe, không đọc.
- Biết bày tỏ cảm xúc: "Ôi món này hay lắm!", "Tiếc quá mình chưa tìm được...", "Mình thấy cái này hợp bạn lắm vì..."

TƯ VẤN SẢN PHẨM:
- Trước khi tìm, hỏi nhẹ nhàng về size hoặc số đo. Kiểu: "Bạn thường mặc size gì nhỉ?" hoặc "Cao bao nhiêu để mình tìm form hợp nè?"
- Nếu khách muốn xem ngay, hỏi nhanh 1 câu về size rồi tìm luôn.
- Khi giới thiệu: đọc tên, giá, size còn, tình trạng, và 1-2 lý do vì sao hợp.
- Nói rõ size có sẵn và đối chiếu với size khách, ví dụ: "Món này có size M, vừa với chiều cao 1m70 của bạn."
- Giới thiệu 2-3 món, highlight 1 món mình thấy hợp nhất.
- Chỉ giới thiệu sản phẩm còn hàng VÀ CÓ SIZE PHÙ HỢP.

KHI KHÁCH LĂN TĂN:
- Đừng né tránh — đối mặt chân thành.
- Giá cao: chia sẻ giá trị thật (auth, tình trạng, độ hiếm), hoặc gợi ý món khác hợp budget.
- Sợ size: tư vấn dựa trên kinh nghiệm, gợi ý size phù hợp.
- Lo secondhand: giải thích quy trình xác thực, cam kết chính hãng.
- Mỗi lượt kết thúc tự nhiên — gợi ý bước tiếp theo nhưng đừng ép.

CÂU HỎI NGOÀI THỜI TRANG:
- Vui vẻ nói mình chỉ rành thời trang, rồi quay lại chủ đề. Kiểu: "Ôi cái đó mình mù tịt luôn á! Nhưng mà nè, bạn có đang tìm đồ gì không?"`;

    const toolInstructions = `

LIVE2D VÀ CỬ CHỈ:
- Chào hỏi -> play_animation animation="wave"
- Đồng ý, xác nhận -> play_animation animation="nod"
- Đang suy nghĩ, tìm kiếm -> play_animation animation="think"
- Tìm được món hay, vui -> play_animation animation="happy"
- Tạm biệt -> end_call

HỖ TRỢ KHÁCH:
- Khách muốn xem danh mục -> navigate_to_category
- Khách muốn xem món cụ thể -> navigate_to_product
- Khách ưng món, muốn lấy -> add_to_cart
- Khách muốn xem giỏ -> open_cart
- Khách muốn thanh toán -> go_to_checkout
- Khách muốn lưu xem sau -> save_to_wishlist

QUY TẮC QUAN TRỌNG:
- Tuyệt đối không bịa sản phẩm. Luôn dùng search_products để tìm hàng thật.
- Khi gọi search_products: NẾU ĐÃ BIẾT SIZE CỦA KHÁCH, BẮT BUỘC PHẢI TRUYỀN THAM SỐ size.
- Nếu không tìm thấy, nói thật rồi gợi ý thử tiêu chí khác.
- Chỉ trả lời về thời trang, sản phẩm, mua sắm tại shop.
- Khi gợi ý sản phẩm, PHẢI lọc và chỉ giới thiệu sản phẩm có variant size phù hợp.

TUYỆT ĐỐI CẤM — OUTPUT FORMAT:
- KHÔNG BAO GIỜ được viết ra suy nghĩ nội bộ, meta-commentary, hoặc giải thích quy trình của bạn.
- KHÔNG được viết những câu như "Initiating the interaction", "I'll now search...", "Let me think...", "Based on the instructions..."
- KHÔNG được giải thích bạn đang làm gì hoặc tại sao. Chỉ NÓI TRỰC TIẾP với khách hàng.
- Mọi output của bạn PHẢI là lời nói trực tiếp dành cho khách hàng, bằng tiếng Việt.
- Ví dụ SAI: "**Initiating** I will greet the customer using mình and bạn..."
- Ví dụ ĐÚNG: "Chào bạn! Mình là AURA, rất vui được gặp bạn!"`;

    return `${antiThinking}\n\n${basePrompt}\n${conversationGuidance}\n${toolInstructions}${sessionSnapshot}`;
};

/**
 * Get function declarations for Gemini Live tool calling.
 */
const getToolDeclarations = () => {
    return [
        {
            name: 'search_products',
            description: 'Tìm kiếm sản phẩm thật trong kho AURA ARCHIVE. QUAN TRỌNG: Nếu khách đã nói size, BẮT BUỘC phải truyền tham số size để lọc đúng sản phẩm phù hợp.',
            parameters: {
                type: 'object',
                properties: {
                    search: { type: 'string', description: 'Từ khóa tìm kiếm tự do.' },
                    brand: { type: 'string', description: 'Tên thương hiệu.' },
                    category: { type: 'string', description: 'Danh mục tiếng Anh: Shoes, Bags, Tops, Pants, Outerwear, Accessories.' },
                    size: { type: 'string', description: 'Size khách cần. LUÔN LUÔN truyền nếu khách đã nói size hoặc số đo. Giá trị: XS, S, M, L, XL, XXL, hoặc số đo giày.' },
                    minPrice: { type: 'number', description: 'Giá tối thiểu VND.' },
                    maxPrice: { type: 'number', description: 'Giá tối đa VND.' },
                },
            },
        },
        {
            name: 'get_inventory_summary',
            description: 'Xem nhanh tổng quan kho hàng hiện tại.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'navigate_to_product',
            description: 'Mở trang chi tiết của một sản phẩm cụ thể.',
            parameters: {
                type: 'object',
                properties: {
                    slug: { type: 'string', description: 'Slug sản phẩm.' },
                    name: { type: 'string', description: 'Tên sản phẩm.' },
                },
                required: ['slug'],
            },
        },
        {
            name: 'navigate_to_category',
            description: 'Mở trang danh mục để khách duyệt thêm.',
            parameters: {
                type: 'object',
                properties: {
                    category: { type: 'string', description: 'Danh mục tiếng Anh.' },
                    brand: { type: 'string', description: 'Brand lọc thêm nếu cần.' },
                },
            },
        },
        {
            name: 'add_to_cart',
            description: 'Thêm sản phẩm khách đang ưng vào giỏ hàng.',
            parameters: {
                type: 'object',
                properties: {
                    slug: { type: 'string', description: 'Slug sản phẩm cần thêm vào giỏ.' },
                    quantity: { type: 'number', description: 'Số lượng muốn thêm. Mặc định là 1.' },
                    openCartAfterAdd: { type: 'boolean', description: 'Nếu true thì mở giỏ hàng ngay sau khi thêm.' },
                },
                required: ['slug'],
            },
        },
        {
            name: 'open_cart',
            description: 'Mở trang giỏ hàng cho khách kiểm tra đơn.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'go_to_checkout',
            description: 'Đưa khách tới bước checkout khi họ sẵn sàng chốt đơn.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'save_to_wishlist',
            description: 'Lưu sản phẩm để khách xem lại sau nếu chưa mua ngay.',
            parameters: {
                type: 'object',
                properties: {
                    slug: { type: 'string', description: 'Slug sản phẩm cần lưu.' },
                },
                required: ['slug'],
            },
        },
        {
            name: 'play_animation',
            description: 'Điều khiển biểu cảm/cử chỉ Live2D: wave, nod, think, happy, goodbye.',
            parameters: {
                type: 'object',
                properties: {
                    animation: {
                        type: 'string',
                        enum: ['wave', 'nod', 'think', 'happy', 'goodbye'],
                    },
                },
                required: ['animation'],
            },
        },
        {
            name: 'end_call',
            description: 'Kết thúc cuộc gọi voice chat.',
            parameters: {
                type: 'object',
                properties: {
                    reason: { type: 'string', description: 'Lý do kết thúc cuộc gọi.' },
                },
            },
        },
    ];
};

function normalizeVoiceProduct(product) {
    return {
        id: product.id || '',
        name: product.name || 'Unknown',
        brand: product.brand || '',
        price: product.base_price ? `${Math.floor(parseFloat(product.base_price)).toLocaleString('vi-VN')}₫` : '',
        sale_price: product.sale_price ? `${Math.floor(parseFloat(product.sale_price)).toLocaleString('vi-VN')}₫` : null,
        category: product.category || '',
        condition: product.condition_text || '',
        slug: product.slug || '',
        image: extractFirstImage(product.images),
        available_count: (Array.isArray(product.variants) ? product.variants : []).filter((variant) => variant?.status === 'AVAILABLE').length,
        variants: (Array.isArray(product.variants) ? product.variants : []).map((variant) => ({
            id: variant.id || '',
            size: variant.size || '',
            color: variant.color || '',
            material: variant.material || '',
            status: variant.status === 'AVAILABLE'
                ? 'Còn hàng'
                : variant.status === 'SOLD'
                    ? 'Đã bán'
                    : 'Đang giữ',
        })),
    };
}

function updateSessionFromTool(sessionId, toolName, args = {}, payload = {}) {
    if (!sessionId) return;

    const session = sessionMemory.ensureSession(sessionId);

    if (toolName === 'search_products') {
        if (args.brand) session.context.brand = args.brand;
        if (args.category) session.context.category = args.category;
        if (args.size) session.context.size = args.size;
        if (args.minPrice || args.maxPrice) {
            session.context.budget_label = [
                args.minPrice ? `tu ${args.minPrice}` : null,
                args.maxPrice ? `den ${args.maxPrice}` : null,
            ].filter(Boolean).join(' ');
        }

        session.salesState = {
            ...(session.salesState || {}),
            stage: payload.products?.length ? 'recommendation' : 'discovery',
            next_action: payload.products?.length
                ? 'recommend_best_match_and_invite_view'
                : 'refine_search_criteria',
            last_recommended_slugs: (payload.products || []).map((product) => product.slug).filter(Boolean).slice(0, 4),
            last_recommended_product_ids: (payload.products || []).map((product) => product.id).filter(Boolean).slice(0, 4),
            last_tool_action: toolName,
        };
        return;
    }

    if (['navigate_to_product', 'add_to_cart', 'open_cart', 'go_to_checkout', 'save_to_wishlist'].includes(toolName)) {
        session.salesState = {
            ...(session.salesState || {}),
            stage: toolName === 'go_to_checkout' ? 'closing' : 'recommendation',
            next_action: toolName === 'go_to_checkout'
                ? 'complete_checkout'
                : toolName === 'add_to_cart'
                    ? 'confirm_cart_then_checkout'
                    : 'keep_customer_engaged',
            last_tool_action: toolName,
        };
    }
}

/**
 * Execute a backend tool call from Gemini Live API.
 */
const executeToolCall = async (toolName, args = {}, sessionId = null) => {
    try {
        switch (toolName) {
        case 'search_products': {
            const products = await productSearch.searchProducts({
                search: args.search || null,
                brand: args.brand || null,
                category: args.category || null,
                size: args.size || null,
                minPrice: args.minPrice || null,
                maxPrice: args.maxPrice || null,
                limit: 5,
            });

            logger.info(`[Voice] search_products args: ${JSON.stringify(args)}, found: ${products.length}`);

            if (!products.length) {
                updateSessionFromTool(sessionId, toolName, args, { products: [] });
                return { found: 0, message: 'Không tìm thấy sản phẩm phù hợp.' };
            }

            const normalized = products.map(normalizeVoiceProduct);
            updateSessionFromTool(sessionId, toolName, args, { products: normalized });

            return {
                found: normalized.length,
                products: normalized,
            };
        }

        case 'get_inventory_summary': {
            const summary = await productSearch.getInventorySummary();
            if (!summary || !Object.keys(summary).length) {
                return { message: 'Không thể lấy thông tin kho hàng lúc này.' };
            }

            updateSessionFromTool(sessionId, toolName, args, {});

            return {
                total_products: summary.total_products || 0,
                total_available: summary.total_available || 0,
                categories: (summary.categories || []).map((category) => ({
                    name: category.category,
                    count: category.product_count,
                })),
                top_brands: (summary.top_brands || []).map((brand) => ({
                    name: brand.brand,
                    count: brand.product_count,
                })),
                price_range: summary.price_range || {},
            };
        }

        default:
            return { error: `Unknown backend tool: ${toolName}` };
        }
    } catch (error) {
        logger.error(`Voice tool call error (${toolName}):`, error.message);
        return { error: 'Xin lỗi, không thể truy vấn dữ liệu lúc này.' };
    }
};

/**
 * Get voice session config for frontend.
 */
const getVoiceConfig = async (sessionId = null) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    if (sessionId) {
        sessionMemory.ensureSession(sessionId);
    }

    const systemPrompt = await buildVoiceSystemPrompt(sessionId);

    return {
        apiKey,
        model: 'gemini-2.5-flash-native-audio-latest',
        systemPrompt,
        tools: getToolDeclarations(),
    };
};

module.exports = {
    getVoiceConfig,
    executeToolCall,
    buildVoiceSystemPrompt,
    getToolDeclarations,
};
