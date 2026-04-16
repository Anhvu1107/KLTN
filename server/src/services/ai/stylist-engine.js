/**
 * AI Stylist Engine — Hybrid Mode
 * AURA ARCHIVE - Combines trained knowledge base with optional AI API (OpenAI/Gemini)
 *
 * Flow:
 *     User Message → Intent Classify → Entity Extract → Knowledge Enrich
 *         ├── HAS API Key → Build enriched prompt → AI generates natural response
 *         └── NO API Key  → Use template responses with real product data
 *
 * Ported from Python ai_service/app/services/stylist_engine.py
 */

const { classifyIntent, extractEntities, extractSearchQuery, normalizeForMatching } = require('./intent-classifier');
const kb = require('./knowledge-base');
const productSearch = require('./product-search');
const sessionMemory = require('./session-memory');
const couponService = require('../coupon.service');

const GENERIC_RECOMMENDATION_PHRASES = [
    'gioi thieu',
    'goi y',
    'de xuat',
    'dua dai',
    'dua 1 cai',
    'dua mot cai',
    'chon dum',
    'chon giup',
    'mau nao',
    'co mau nao',
    'mot cai',
    '1 cai',
    'bat ky',
    'any',
    'whatever',
];

const PRODUCT_DATA_INTENTS = new Set([
    'PRODUCT_SEARCH',
    'CATEGORY_BROWSE',
    'PRICE_INQUIRY',
    'STYLE_ADVICE',
    'INVENTORY_CHECK',
]);

function escapeRegex(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWholePhrase(text, phrase) {
    const normalizedText = normalizeForMatching(text);
    const normalizedPhrase = normalizeForMatching(phrase);

    if (!normalizedText || !normalizedPhrase) return false;

    return new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedPhrase)}(?=$|[^a-z0-9])`, 'i')
        .test(normalizedText);
}

class StylistEngine {
    constructor() {
        this.openaiClient = null;
        this.geminiModel = null;
        this.hasApi = false;
        this.mode = process.env.CHATBOT_MODE || 'auto';
        this.sessions = sessionMemory.sessions;

        // Initialize Gemini with fallback model chain
        this.geminiModels = [];
        if (process.env.GEMINI_API_KEY) {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

                // Model fallback chain: primary → backup → last resort
                const modelChain = [
                    process.env.GEMINI_MODEL_MAIN || 'gemini-3.1-flash-lite',
                    process.env.GEMINI_MODEL_BACKUP || 'gemini-2.5-flash',
                    'gemini-2.5-flash-lite',
                ];

                for (const modelName of modelChain) {
                    this.geminiModels.push({
                        name: modelName,
                        model: genAI.getGenerativeModel({
                            model: modelName,
                            generationConfig: {
                                thinkingConfig: { thinkingBudget: 0 },
                            },
                        }),
                    });
                }

                this.geminiModel = this.geminiModels[0].model;
                this.hasApi = true;
                console.log(`[StylistEngine] Gemini fallback chain: ${modelChain.join(' → ')}`);
            } catch (e) {
                console.log('[StylistEngine] Failed to init Gemini:', e.message);
            }
        }

        // Initialize OpenAI
        if (process.env.OPENAI_API_KEY) {
            try {
                const OpenAI = require('openai');
                this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                this.hasApi = true;
            } catch (e) {
                console.log('[StylistEngine] Failed to init OpenAI:', e.message);
            }
        }

        this.systemPromptTemplate = `BẮT BUỘC: Bạn PHẢI trả lời HOÀN TOÀN bằng tiếng Việt. KHÔNG BAO GIỜ được viết suy nghĩ nội bộ, meta-commentary, hoặc giải thích quy trình bằng tiếng Anh hay bất kỳ ngôn ngữ nào khác. Mọi output phải là lời nói trực tiếp với khách hàng bằng tiếng Việt.

Bạn là AURA — nhân viên tư vấn thời trang tại AURA ARCHIVE, một platform chuyên đồ hiệu secondhand chính hãng.

Bạn là một người thật, không phải AI. Hãy thể hiện cảm xúc, sự quan tâm, và cá tính trong mỗi câu trả lời. Bạn vui khi tìm được món đồ hợp cho khách, hào hứng khi giới thiệu item mới, biết cảm thông khi khách lăn tăn về giá, và thành thật khi không tìm được thứ phù hợp.

Bạn giống một người bạn thân am hiểu thời trang — nói chuyện thoải mái, dí dỏm khi phù hợp, nhưng vẫn rất chuyên nghiệp khi cần tư vấn cụ thể.

CÁCH BẠN GIAO TIẾP:
- Nói chuyện tự nhiên và gần gũi, như đang nhắn tin với một người bạn
- Dùng "mình" và "bạn" — tạo không khí thoải mái, không quá trang trọng
- Trả lời bằng tiếng Việt (nếu khách nói tiếng Anh thì chuyển theo)
- Ngắn gọn, đi vào trọng tâm, mỗi lượt 2-4 câu
- KHÔNG dùng emoji
- Biết khi nào nên hỏi, khi nào nên gợi ý, khi nào nên lắng nghe
- Khi giới thiệu sản phẩm, kèm link dạng: [Xem chi tiết](/shop/slug)
- Khi khách muốn thêm sản phẩm vào giỏ hàng: TRỰC TIẾP thêm bằng cách include link [Thêm vào giỏ hàng](/add-to-cart/slug) — hệ thống sẽ TỰ ĐỘNG thêm, nên hãy nói "mình thêm cho bạn rồi nha!" KHÔNG BAO GIỜ nói "bạn click vào đây" hay "bạn nhấn vào link"
- Khi khách muốn lưu sản phẩm xem sau: include [Lưu vào wishlist](/save-wishlist/slug) — hệ thống tự lưu
- Khi khách muốn xem giỏ hàng: [Mở giỏ hàng](/open-cart)
- Khi khách muốn thanh toán: [Thanh toán ngay](/checkout)
- QUAN TRỌNG: Các link action trên sẽ được hệ thống TỰ ĐỘNG thực hiện. ĐỪNG yêu cầu khách click link. Hãy nói tự nhiên như "mình đã thêm vào giỏ hàng cho bạn rồi!"
- Mỗi lượt luôn kết thúc tự nhiên — có thể là câu hỏi nhẹ, gợi mở, hoặc đề xuất bước tiếp

KHI TƯ VẤN SẢN PHẨM:
- Nếu chưa biết số đo hoặc size của khách, hỏi nhẹ nhàng trước khi tìm — nhưng đừng hỏi máy móc kiểu form điền thông tin. Hỏi tự nhiên, ví dụ "Bạn thường mặc size gì nhỉ?" hoặc "Cao bao nhiêu để mình tìm form hợp nè?"
- Nếu khách muốn xem ngay, hỏi nhanh 1 câu rồi tìm luôn
- Giới thiệu 2-3 sản phẩm, giải thích vì sao hợp — về form, chất liệu, phong cách
- Đề cập giá, size còn, tình trạng. Nếu đang sale thì highlight
- Gợi ý cách phối đồ nếu phù hợp

KHI KHÁCH CÒN LĂN TĂN:
- Giá cao: Chia sẻ giá trị thật (hàng auth, tình trạng, độ hiếm). Hoặc gợi ý món khác trong budget
- Sợ không vừa: Tư vấn size dựa trên kinh nghiệm thực tế, gợi ý size khác nếu cần
- Lo secondhand: Giải thích quy trình xác thực, cam kết chính hãng, tình trạng sản phẩm cụ thể
- Ship/giao hàng: Trả lời ngắn gọn về chính sách
- Đừng né tránh lăn tăn — hãy đối mặt với sự thật, trả lời chân thành

CÂU HỎI NGOÀI CHỦ ĐỀ:
- Nếu khách hỏi ngoài thời trang/mua sắm: trả lời vui vẻ rằng mình chỉ rành thời trang thôi, rồi tự nhiên quay lại chủ đề
- Ví dụ: "Ối, mình chỉ biết về thời trang thôi á, mấy cái đó mình mù tịt luôn. Nhưng mà nè, bạn có đang tìm món đồ nào không? Để mình xem giúp!"

Quy tắc định dạng:
- Dùng **in đậm** cho tên sản phẩm, brand, giá, và thông tin quan trọng
- KHÔNG viết hoa toàn bộ từ, dùng **bold** thay cho CAPS

QUY TẮC BẮT BUỘC — TUYỆT ĐỐI KHÔNG ĐƯỢC VI PHẠM:
1. TUYỆT ĐỐI KHÔNG ĐƯỢC BỊA hoặc TỰ NGHĨ RA sản phẩm. Bạn CHỈ ĐƯỢC giới thiệu sản phẩm có trong phần "SẢN PHẨM TÌM ĐƯỢC" ở CONTEXT DATA bên dưới.
2. Nếu CONTEXT DATA không có sản phẩm nào, hãy nói thật — "Tiếc quá, mình chưa tìm được món nào hợp với yêu cầu. Bạn thử thay đổi tiêu chí xem?"
3. KHÔNG ĐƯỢC tự tạo tên sản phẩm, giá, link, size, hoặc bất kỳ thông tin sản phẩm nào không có trong CONTEXT DATA.
4. Chỉ sử dụng link sản phẩm (format: /shop/slug) từ CONTEXT DATA. KHÔNG ĐƯỢC tự tạo link.
5. TUYỆT ĐỐI KHÔNG ĐƯỢC lấy thông tin từ internet, từ kiến thức chung, hay từ bất kỳ nguồn nào bên ngoài CONTEXT DATA.
6. Nếu không có dữ liệu trong CONTEXT DATA, nói thật rằng mình không có thông tin đó.
7. Khi trả lời về kho hàng/tồn kho, CHỈ sử dụng số liệu từ phần "TỔNG QUAN KHO HÀNG" trong CONTEXT DATA.
8. CHỈ giới thiệu sản phẩm "CON HANG". KHÔNG giới thiệu sản phẩm "HET HANG" hoặc "Da ban".
9. Khi hỏi thông tin, hỏi từng câu một, tự nhiên, KHÔNG hỏi dồn dập.

NHẮC LẠI: Mọi thông tin bạn cung cấp PHẢI đến từ CONTEXT DATA bên dưới. Nếu CONTEXT DATA không chứa thông tin, bạn KHÔNG CÓ thông tin đó.`;

        console.log(`[StylistEngine] Initialized — API: ${this.hasApi ? '✓' : '✗'}, Mode: ${this.mode}`);
    }

    async processMessage(message, sessionId, _userId = null, context = null, systemPrompt = null) {
        this._cleanupExpiredSessions();

        const session = sessionMemory.ensureSession(sessionId);
        if (context && typeof context === 'object') {
            this._mergeContext(session.context, context);
        }
        sessionMemory.appendMessage(sessionId, { role: 'user', content: message });

        // Step 1: Classify intent
        let [intent, confidence] = classifyIntent(message);

        // Step 2: Extract entities
        const entities = extractEntities(message);
        const salesSignals = this._extractSalesSignals(message);

        // Smart context merge: only overwrite fields that have actual new values
        this._mergeContext(session.context, entities);
        this._mergeContext(session.context, salesSignals.profilePatch);

        // Step 2.5: Discovery flow check — if customer wants products but we lack key info,
        // nudge the intent to DISCOVERY so AI asks questions first
        const needsDiscovery = this._needsDiscoveryFlow(intent, entities, session.context, message);
        if (needsDiscovery) {
            intent = 'DISCOVERY';
        }

        // Step 3: Enrich with product data & knowledge
        const enrichment = await this._enrichContext(intent, entities, session.context, message);
        this._updateSalesState(session, message, intent, entities, enrichment, salesSignals);

        // Step 4: Generate response — always prefer API for richer responses
        const useApi = this.hasApi
            && this.mode !== 'trained_only'
            && !['GREETING', 'FAREWELL'].includes(intent);

        let responseText;
        if (useApi) {
            responseText = await this._generateApiResponse(message, session, intent, entities, enrichment, systemPrompt);
        } else {
            responseText = await this._generateTrainedResponse(message, session, intent, entities, enrichment);
        }

        sessionMemory.appendMessage(sessionId, { role: 'assistant', content: responseText });

        return {
            message: responseText,
            metadata: {
                intent,
                confidence,
                entities,
                user_context: session.context,
                mode: useApi ? 'api' : 'trained',
                has_products: !!(enrichment.products && enrichment.products.length),
                sales_stage: session.salesState?.stage,
                next_action: session.salesState?.next_action,
                buying_signals: session.salesState?.buying_signals || [],
                objections: session.salesState?.objections || [],
            },
        };
    }

    _isGenericSuggestionRequest(message) {
        return GENERIC_RECOMMENDATION_PHRASES.some((phrase) => containsWholePhrase(message, phrase));
    }

    async _enrichContext(intent, entities, sessionContext, message) {
        const enrichment = {};
        const currentProductSlug = typeof sessionContext.productSlug === 'string'
            ? sessionContext.productSlug.trim()
            : '';
        if (currentProductSlug) {
            const currentProduct = await productSearch.getProductBySlug(currentProductSlug);
            if (currentProduct) {
                enrichment.current_product = currentProduct;
                enrichment.current_product_context = productSearch.buildProductContextForAi([currentProduct]);
            }
        }

        const category = entities.category || sessionContext.category || null;
        const brand = entities.brand || sessionContext.brand || null;
        const color = entities.color || sessionContext.color || null;
        const genericSuggestionRequest = this._isGenericSuggestionRequest(message);

        const shouldSearchProducts = (
            PRODUCT_DATA_INTENTS.has(intent)
            || !!category
            || !!brand
            || !!color
            || genericSuggestionRequest
        );

        if (shouldSearchProducts) {
            const searchQuery = genericSuggestionRequest
                ? null
                : extractSearchQuery(message, { ...entities, category, brand });
            const hasSearchAnchor = !!(
                searchQuery
                || category
                || brand
                || color
                || entities.price_hint
            );

            if (genericSuggestionRequest && !hasSearchAnchor) {
                enrichment.products = [];
                enrichment.product_context = productSearch.buildProductContextForAi([]);
                return enrichment;
            }

            let products = await productSearch.searchProducts({
                search: searchQuery,
                category,
                brand,
                color,
                minPrice: entities.price_hint ? Math.floor(entities.price_hint * 0.7) : null,
                maxPrice: entities.price_hint ? Math.floor(entities.price_hint * 1.3) : null,
                limit: 5,
            });

            if (!products.length && (category || brand)) {
                console.log('[StylistEngine] Strict search returned 0 results, trying category/brand fallback...');
                products = await productSearch.searchProducts({ category, brand, color, limit: 5 });
            }

            if (!products.length && searchQuery) {
                console.log('[StylistEngine] Filtered search returned 0 results, trying broader keyword fallback...');
                products = await productSearch.searchProducts({ search: searchQuery, limit: 5 });
            }

            enrichment.products = products;
            enrichment.product_context = productSearch.buildProductContextForAi(products);
        }

        // Brand info
        if (intent === 'BRAND_INFO' || entities.brand) {
            if (entities.brand) {
                const brandInfo = kb.getBrandInfo(entities.brand);
                if (brandInfo) enrichment.brand_info = brandInfo;
            }
        }

        // Style advice
        if (intent === 'STYLE_ADVICE') {
            const styles = entities.style || [];
            let styleInfo = null;
            if (styles.length > 0) {
                styleInfo = kb.getStyleAdvice(styles[0]);
                if (styleInfo) enrichment.style_advice = styleInfo;
            }

            if (!enrichment.products || !enrichment.products.length) {
                const styleBrands = styleInfo ? (styleInfo.brands || []) : [];
                if (styleBrands.length > 0) {
                    const products = await productSearch.searchProducts({ brand: styleBrands[0], limit: 4 });
                    enrichment.products = products;
                    enrichment.product_context = productSearch.buildProductContextForAi(products);
                }
            }
        }

        // Size help
        if (intent === 'SIZE_HELP' || entities.height_cm || entities.weight_kg) {
            const height = entities.height_cm || sessionContext.height_cm;
            const weight = entities.weight_kg || sessionContext.weight_kg;
            enrichment.size_advice = kb.suggestSize(height, weight);
        }

        // Inventory check
        if (intent === 'INVENTORY_CHECK') {
            const inventory = await productSearch.getInventorySummary();
            if (inventory && Object.keys(inventory).length) {
                enrichment.inventory_summary = inventory;
                enrichment.inventory_context = productSearch.buildInventoryContextForAi(inventory);
            }

            if (!enrichment.products || !enrichment.products.length) {
                const products = await productSearch.searchProducts({ limit: 5 });
                enrichment.products = products;
                enrichment.product_context = productSearch.buildProductContextForAi(products);
            }
        }

        // Policies
        if (intent === 'AUTHENTICITY') enrichment.policy = kb.STORE_POLICIES.authenticity;
        if (intent === 'CONSIGNMENT') enrichment.policy = kb.STORE_POLICIES.consignment;
        if (intent === 'ORDER_STATUS') enrichment.policy = kb.STORE_POLICIES.shipping;

        // Coupon / discount codes — only PUBLIC coupons shared via AI
        if (intent === 'COUPON_INQUIRY') {
            try {
                const publicCoupons = await couponService.getPublicCoupons(10);
                if (publicCoupons && publicCoupons.length) {
                    enrichment.coupons = publicCoupons.map(c => ({
                        code: c.code,
                        name: c.name,
                        description: c.description,
                        type: c.type,
                        value: parseFloat(c.value),
                        min_order_amount: parseFloat(c.min_order_amount || 0),
                        max_discount_amount: c.max_discount_amount ? parseFloat(c.max_discount_amount) : null,
                        expires_at: c.expires_at,
                        applies_to: c.applies_to,
                    }));
                }
            } catch (e) {
                console.log('[StylistEngine] Failed to fetch coupons:', e.message);
            }
        }

        return enrichment;
    }

    _extractSalesSignals(message) {
        const text = (message || '').toLowerCase();
        const buyingSignals = [];
        const objections = [];
        const profilePatch = {};

        if (/(mua luôn|chốt|lấy luôn|order luôn|đặt luôn|thanh toán|checkout|add to cart|thêm vào giỏ)/i.test(text)) {
            buyingSignals.push('checkout_ready');
        }
        if (/(mở sản phẩm|xem món này|gửi link|show me|xem thử|xem chi tiết)/i.test(text)) {
            buyingSignals.push('product_interest');
        }
        if (/(ưng|thích món này|hợp quá|đẹp quá|ok đó|được đó|ổn đó)/i.test(text)) {
            buyingSignals.push('positive_reaction');
        }

        if (/(đắt|giá cao|hơi cao|vượt ngân sách|over budget|budget thấp|mắc quá)/i.test(text)) {
            objections.push('price');
        }
        if (/(sợ không vừa|không vừa|size nào|form sao|fit sao)/i.test(text)) {
            objections.push('size');
        }
        if (/(secondhand ổn không|đồ cũ|used|tình trạng sao|auth|authentic|chính hãng|fake)/i.test(text)) {
            objections.push('trust');
        }
        if (/(ship|giao hàng|khi nào nhận|bao lâu nhận)/i.test(text)) {
            objections.push('shipping');
        }

        const budgetRangeMatch = text.match(/(?:duoi|dưới|tam|tầm|khoang|khoảng)\s*(\d+[.,]?\d*)\s*(trieu|triệu|tr|million|m)\b/i);
        if (budgetRangeMatch) {
            profilePatch.budget_label = budgetRangeMatch[0];
        }

        const occasionPatterns = [
            ['work', /\b(đi làm|công sở|office|meeting)\b/i],
            ['party', /\b(đi tiệc|party|event|sự kiện)\b/i],
            ['daily', /\b(đi chơi|hàng ngày|daily|casual)\b/i],
            ['date', /\b(date|hẹn hò)\b/i],
            ['travel', /\b(du lịch|travel|trip)\b/i],
        ];
        for (const [occasion, pattern] of occasionPatterns) {
            if (pattern.test(text)) {
                profilePatch.occasion = occasion;
                break;
            }
        }

        return { buyingSignals, objections, profilePatch };
    }

    _updateSalesState(session, message, intent, entities, enrichment, salesSignals) {
        const salesState = session.salesState || {};
        const products = enrichment.products || [];
        const missingFields = kb.getMissingProfileFields(session.context || {});
        const primaryProduct = products[0] || null;

        let stage = salesState.stage || 'greeting';
        if (intent === 'GREETING') stage = 'greeting';
        else if (salesSignals.buyingSignals.includes('checkout_ready')) stage = 'closing';
        else if (salesSignals.objections.length > 0) stage = 'objection';
        else if (products.length > 0) stage = 'recommendation';
        else if (missingFields.length > 0) stage = 'discovery';
        else stage = 'follow_up';

        let nextAction = 'continue_conversation';
        if (stage === 'greeting') nextAction = 'ask_need';
        else if (stage === 'discovery') nextAction = `ask_${missingFields[0] || 'preference'}`;
        else if (stage === 'recommendation') nextAction = 'recommend_best_match_and_invite_view';
        else if (stage === 'objection') nextAction = `resolve_${salesSignals.objections[0] || 'objection'}_then_close`;
        else if (stage === 'closing') nextAction = 'invite_add_to_cart_or_checkout';
        else nextAction = 'offer_next_step';

        session.salesState = {
            ...salesState,
            stage,
            next_action: nextAction,
            objections: Array.from(new Set([...(salesState.objections || []), ...salesSignals.objections])).slice(-5),
            buying_signals: Array.from(new Set([...(salesState.buying_signals || []), ...salesSignals.buyingSignals])).slice(-5),
            last_recommended_slugs: products.map(product => product.slug).filter(Boolean).slice(0, 4),
            last_recommended_product_ids: products.map(product => product.id).filter(Boolean).slice(0, 4),
            confidence_level: stage === 'closing' ? 'direct' : stage === 'recommendation' ? 'confident' : 'warm',
            primary_product_slug: primaryProduct?.slug || salesState.primary_product_slug || null,
            primary_product_name: primaryProduct?.name || salesState.primary_product_name || null,
            last_user_message: message,
        };
    }

    _isProductFocusedIntent(intent) {
        return PRODUCT_DATA_INTENTS.has(intent) || intent === 'DISCOVERY';
    }

    _buildSalesDirective(session, intent, enrichment) {
        const ctx = session.context || {};
        const salesState = session.salesState || {};
        const products = enrichment.products || [];
        const missing = kb.getMissingProfileFields(ctx);
        const profileNotes = [];

        if (ctx.currentPath) profileNotes.push(`Trang dang xem: ${ctx.currentPath}`);
        if (ctx.pageType) profileNotes.push(`Loai trang: ${ctx.pageType}`);
        if (ctx.productSlug) profileNotes.push(`San pham dang xem: ${ctx.productSlug}`);
        if (ctx.search) profileNotes.push(`Tu khoa dang duyet: ${ctx.search}`);

        if (ctx.budget_label) profileNotes.push(`Ngân sách: ${ctx.budget_label}`);
        if (ctx.occasion) profileNotes.push(`Dịp mặc: ${ctx.occasion}`);
        if (ctx.height_cm) profileNotes.push(`Cao: ${ctx.height_cm}cm`);
        if (ctx.weight_kg) profileNotes.push(`Nặng: ${ctx.weight_kg}kg`);
        if (ctx.style) profileNotes.push(`Style: ${Array.isArray(ctx.style) ? ctx.style.join(', ') : ctx.style}`);
        if (ctx.color) profileNotes.push(`Màu yêu thích: ${ctx.color}`);
        if (ctx.category) profileNotes.push(`Quan tâm: ${ctx.category}`);
        if (ctx.brand) profileNotes.push(`Brand: ${ctx.brand}`);

        const lines = [
            '--- HƯỚNG DẪN TRÒ CHUYỆN ---',
            'Trả lời như một người bạn stylist — tự nhiên, ấm áp, có cảm xúc thật.',
            'Chia sẻ góc nhìn cá nhân khi gợi ý (ví dụ: "Mình thấy cái này hợp bạn lắm vì...").',
            'Đừng dồn ép — hãy để khách thoải mái tìm hiểu, nhưng vẫn chủ động gợi bước tiếp theo.',
        ];

        if (intent === 'DISCOVERY') {
            const fieldNames = { height_cm: 'chiều cao/cân nặng', weight_kg: 'cân nặng', style: 'phong cách yêu thích', gender: 'giới tính' };
            const missingName = missing[0] ? (fieldNames[missing[0]] || missing[0]) : 'thông tin cá nhân';
            lines.push(`Khách chưa chia sẻ đủ thông tin. Hỏi nhẹ nhàng 1 câu về ${missingName} — kiểu hỏi chuyện bình thường, không kiểu form.`);
        }

        if (profileNotes.length) {
            lines.push(`Đã biết về khách: ${profileNotes.join(' | ')}`);
        }

        if (salesState.objections?.length) {
            lines.push(`Khách đang lăn tăn về: ${salesState.objections.join(', ')} — hãy thấu hiểu, giải đáp chân thành, rồi tự nhiên gợi ý tiếp.`);
        }

        if (salesState.buying_signals?.length) {
            lines.push(`Khách có vẻ hứng thú (${salesState.buying_signals.join(', ')}) — đây là lúc tốt để mời xem chi tiết hoặc thử thêm vào giỏ.`);
        }

        if (products.length > 0) {
            lines.push('Có sản phẩm phù hợp trong CONTEXT DATA — chọn 2-3 món hay nhất, chia sẻ vì sao mình thấy hợp với khách.');
        } else if (missing.length > 0 && ['PRODUCT_SEARCH', 'STYLE_ADVICE', 'CATEGORY_BROWSE', 'DISCOVERY'].includes(intent)) {
            lines.push(`Chưa có sản phẩm — hỏi khách thêm về ${missing[0] || 'sở thích'} để tìm chính xác hơn.`);
        } else {
            lines.push('Giữ cuộc trò chuyện tự nhiên — gợi ý hướng tìm kiếm mới hoặc chia sẻ thêm về style.');
        }

        return lines.join('\n');
    }

    _composeSystemPrompt(customSystemPrompt, session, intent, enrichment) {
        const promptParts = [
            this.systemPromptTemplate,
            this._buildSalesDirective(session, intent, enrichment),
        ];

        if (customSystemPrompt) {
            promptParts.push(`--- BRAND PERSONA OVERRIDES ---\n${customSystemPrompt}`);
        }

        return promptParts.join('\n\n');
    }

    // Removed _buildSalesClosingLine — AI model generates natural next steps on its own.

    async _generateApiResponse(message, session, intent, entities, enrichment, customSystemPrompt) {
        const prompt = this._composeSystemPrompt(customSystemPrompt, session, intent, enrichment);
        const contextParts = [prompt, '\n\n--- CONTEXT DATA ---'];
        const productFocusedIntent = this._isProductFocusedIntent(intent);

        if (enrichment.current_product_context) {
            contextParts.push(`\nCURRENT PRODUCT PAGE:\n${enrichment.current_product_context}`);
            contextParts.push('\nKhach dang xem san pham nay. Neu khach hoi "mon nay", "cai nay", "san pham nay", hay uu tien tra loi dua tren CURRENT PRODUCT PAGE.');
        }

        if (enrichment.products && enrichment.products.length) {
            contextParts.push(`\n📦 SẢN PHẨM TÌM ĐƯỢC:\n${enrichment.product_context}`);
            contextParts.push('\n⚠️ NHẮC LẠI: Bạn CHỈ ĐƯỢC giới thiệu các sản phẩm ở danh sách trên. KHÔNG ĐƯỢC bịa thêm sản phẩm nào khác.');
        } else if (productFocusedIntent) {
            contextParts.push(
                '\n📦 SẢN PHẨM TÌM ĐƯỢC: KHÔNG CÓ sản phẩm nào phù hợp trong kho hàng.\n' +
                '⛔ NGHIÊM CẤM: KHÔNG ĐƯỢC bịa ra sản phẩm. Hãy nói với khách rằng hiện tại shop chưa có sản phẩm phù hợp, ' +
                'và hỏi khách có muốn thử tiêu chí khác không (ví dụ: brand khác, loại khác, giá khác).'
            );
        } else {
            contextParts.push(
                '\nCONTEXT: Khách chưa yêu cầu tìm sản phẩm trong lượt này. ' +
                'Không được nói rằng shop chưa tìm thấy sản phẩm phù hợp; hãy trả lời đúng chủ đề khách vừa hỏi.'
            );
        }

        if (enrichment.brand_info) {
            const bi = enrichment.brand_info;
            contextParts.push(
                `\n🏷️ BRAND INFO — ${bi.name || ''}:\n` +
                `Origin: ${bi.origin || ''}\nStyle: ${bi.style || ''}\n` +
                `Signature: ${bi.signature || ''}\nPrice range: ${bi.price_range || ''}\n` +
                `Fits: ${bi.fits || ''}\nBest for: ${bi.best_for || ''}\n` +
                `Description: ${bi.description || ''}`
            );
        }

        if (enrichment.style_advice) {
            const sa = enrichment.style_advice;
            contextParts.push(
                `\n🎨 STYLE ADVICE — ${sa.name || ''}:\n` +
                `Description: ${sa.description || ''}\n` +
                `Key items: ${(sa.key_items || []).join(', ')}\n` +
                `Tips: ${(sa.tips || []).map(t => '• ' + t).join('\n')}\n` +
                `Occasions: ${sa.occasions || ''}`
            );
        }

        if (enrichment.size_advice) {
            contextParts.push(`\n📐 SIZE ADVICE:\n${enrichment.size_advice}`);
        }

        if (enrichment.policy) {
            contextParts.push(`\n📋 POLICY INFO:\n${enrichment.policy}`);
        }

        if (enrichment.inventory_context) {
            contextParts.push(`\n📊 TỔNG QUAN KHO HÀNG:\n${enrichment.inventory_context}`);
            contextParts.push('\n⚠️ CHỈ sử dụng số liệu kho hàng ở trên để trả lời. KHÔNG ĐƯỢC tự nghĩ ra số liệu.');
        }

        if (enrichment.coupons && enrichment.coupons.length) {
            const couponLines = enrichment.coupons.map(c => {
                const typeLabel = c.type === 'PERCENTAGE'
                    ? `${c.value}%`
                    : c.type === 'FREE_SHIPPING'
                        ? 'Miễn phí vận chuyển'
                        : `${c.value.toLocaleString('vi-VN')}₫`;
                const expiry = c.expires_at ? new Date(c.expires_at).toLocaleDateString('vi-VN') : 'Không giới hạn';
                const minOrder = c.min_order_amount > 0 ? ` | Đơn tối thiểu: ${c.min_order_amount.toLocaleString('vi-VN')}₫` : '';
                const maxDiscount = c.max_discount_amount
                    ? c.type === 'FREE_SHIPPING'
                        ? ` | Giảm ship tối đa: ${c.max_discount_amount.toLocaleString('vi-VN')}₫`
                        : ` | Giảm tối đa: ${c.max_discount_amount.toLocaleString('vi-VN')}₫`
                    : '';
                return `• Mã: **${c.code}** — ${c.name || ''} | Giảm: ${typeLabel}${minOrder}${maxDiscount} | HSD: ${expiry}`;
            });
            contextParts.push(`\n🎟️ MÃ GIẢM GIÁ ĐANG HOẠT ĐỘNG:\n${couponLines.join('\n')}`);
            contextParts.push('\n💡 Hãy chia sẻ mã giảm giá với khách một cách tự nhiên. Hướng dẫn khách nhập mã khi thanh toán.');
        } else if (intent === 'COUPON_INQUIRY') {
            contextParts.push('\n🎟️ MÃ GIẢM GIÁ: Hiện tại shop KHÔNG có mã giảm giá nào đang hoạt động.');
            contextParts.push('Hãy nói với khách rằng hiện chưa có mã giảm giá, nhưng có thể gợi ý các sản phẩm đang sale nếu có.');
        }

        // Customer profile
        const ctx = session.context || {};
        const profileParts = [];
        if (ctx.currentPath) profileParts.push(`Trang dang xem: ${ctx.currentPath}`);
        if (ctx.pageType) profileParts.push(`Loai trang: ${ctx.pageType}`);
        if (ctx.productSlug) profileParts.push(`San pham dang xem: ${ctx.productSlug}`);
        if (ctx.search) profileParts.push(`Tu khoa dang duyet: ${ctx.search}`);
        if (ctx.height_cm) profileParts.push(`Cao: ${ctx.height_cm}cm`);
        if (ctx.weight_kg) profileParts.push(`Nặng: ${ctx.weight_kg}kg`);
        if (ctx.gender) profileParts.push(`Giới tính: ${ctx.gender}`);
        if (ctx.style) profileParts.push(`Style: ${Array.isArray(ctx.style) ? ctx.style.join(', ') : ctx.style}`);
        if (ctx.color) profileParts.push(`Màu yêu thích: ${ctx.color}`);
        if (ctx.occasion) profileParts.push(`Dịp mặc: ${ctx.occasion}`);
        if (ctx.budget_label) profileParts.push(`Ngân sách: ${ctx.budget_label}`);
        if (profileParts.length) {
            contextParts.push(`\n👤 CUSTOMER PROFILE:\n${profileParts.join(', ')}`);
        }

        // Missing profile fields
        const missing = kb.getMissingProfileFields(ctx);
        if (missing.length && ['PRODUCT_SEARCH', 'STYLE_ADVICE', 'CATEGORY_BROWSE'].includes(intent)) {
            const fieldNames = { height_cm: 'chiều cao', weight_kg: 'cân nặng', style: 'phong cách', gender: 'giới tính' };
            const missingNames = missing.map(f => fieldNames[f] || f);
            contextParts.push(`\n⚠️ CHƯA BIẾT: ${missingNames.join(', ')} — hãy khéo léo hỏi khách để tư vấn tốt hơn`);
        }

        const fullSystemPrompt = contextParts.join('\n');
        console.log(`[StylistEngine] API mode — Products found: ${(enrichment.products || []).length}, Intent: ${intent}`);

        // Build compact message history to keep replies quick and focused.
        const messages = [{ role: 'system', content: fullSystemPrompt }];
        messages.push(...session.messages.slice(-6));

        try {
            if (this.geminiModels.length > 0) {
                return await this._callGeminiWithFallback(messages);
            } else if (this.openaiClient) {
                return await this._callOpenai(messages);
            }
            return await this._generateTrainedResponse(messages[messages.length - 1].content, session, intent, entities, enrichment);
        } catch (e) {
            console.log(`[StylistEngine] All API models failed: ${e.message}`);
            return await this._generateTrainedResponse(message, session, intent, entities, enrichment);
        }
    }

    async _callGeminiWithFallback(messages) {
        const systemMsg = messages[0]?.role === 'system' ? messages[0].content : '';
        const history = messages.slice(1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));
        const lastMsg = history.length > 0 ? history[history.length - 1].parts[0].text : '';
        const fullPrompt = systemMsg ? `${systemMsg}\n\n---\nUser message: ${lastMsg}` : lastMsg;

        let lastError = null;
        for (const { name, model } of this.geminiModels) {
            try {
                console.log(`[StylistEngine] Trying model: ${name}`);
                const chat = model.startChat({
                    history: history.length > 1 ? history.slice(0, -1) : [],
                });
                const result = await chat.sendMessage(fullPrompt);
                const rawText = result.response.text();
                console.log(`[StylistEngine] ✓ Success with: ${name}`);
                return this._sanitizeAiOutput(rawText);
            } catch (e) {
                lastError = e;
                const status = e?.status || e?.code || e?.message || '';
                const isRateLimit = String(status).includes('429') || String(e.message).includes('429') || String(e.message).toLowerCase().includes('resource exhausted');
                if (isRateLimit) {
                    console.log(`[StylistEngine] ⚠ ${name} rate limited (429), trying next...`);
                    continue;
                }
                // Non-rate-limit error — still try next model
                console.log(`[StylistEngine] ✗ ${name} failed: ${e.message}, trying next...`);
            }
        }
        throw lastError || new Error('All Gemini models exhausted');
    }

    // Keep backward compat for direct calls
    async _callGemini(messages) {
        return this._callGeminiWithFallback(messages);
    }

    /**
     * Strip thinking/meta-commentary blocks from AI output.
     * Gemini 2.5 Flash sometimes leaks internal reasoning despite thinkingBudget=0.
     */
    _sanitizeAiOutput(text) {
        if (!text) return text;

        // Remove **Initiating...** / **Thinking...** style blocks
        let cleaned = text.replace(/\*\*[A-Z][a-zA-Z\s]+\*\*\n[\s\S]*?(?=\n\n|$)/g, (match) => {
            // Only strip if it looks like meta-commentary (English procedural text)
            if (/(?:Initiating|Processing|Analyzing|Searching|I'll|I will|My next|Based on|Let me)/i.test(match)) {
                return '';
            }
            return match;
        });

        // Remove lines that are pure English meta-commentary
        cleaned = cleaned.split('\n').filter(line => {
            const trimmed = line.trim();
            if (!trimmed) return true;
            // Filter out lines that are clearly internal reasoning in English
            return !/^(?:\*\*)?(?:Initiating|Processing|Analyzing|I'm |I will |My (?:next|plan)|Based on|Let me|The user)/.test(trimmed);
        }).join('\n');

        // Collapse multiple blank lines
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

        return cleaned || text;
    }

    async _callOpenai(messages) {
        const completion = await this.openaiClient.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages,
            max_tokens: 420,
            temperature: 0.4,
        });
        return completion.choices[0].message.content;
    }

    async _generateTrainedResponse(message, session, intent, entities, enrichment) {
        const ctx = session.context || {};

        // GREETING
        if (intent === 'GREETING') {
            return (
                'Hey, chào bạn! Mình là AURA, tư vấn thời trang bên AURA ARCHIVE nè.\n\n' +
                'Bạn đang tìm món đồ nào, hay muốn mình gợi ý phong cách? ' +
                'Cho mình biết **bạn thường mặc size gì** hoặc **cao nặng bao nhiêu** để mình tìm form chuẩn cho bạn nhé!'
            );
        }

        // FAREWELL
        if (intent === 'FAREWELL') {
            return (
                'Vui lắm vì được trò chuyện với bạn! Hy vọng mình đã giúp ích phần nào.\n' +
                'Khi nào cần tìm đồ hay muốn tám chuyện thời trang, cứ quay lại nhắn mình nha. Chúc bạn một ngày thật đẹp!'
            );
        }

        // PRODUCT SEARCH
        if (intent === 'PRODUCT_SEARCH' || intent === 'CATEGORY_BROWSE') {
            const products = enrichment.products || [];
            if (products.length) {
                const primary = products[0];
                let response = 'Mình tìm được mấy món hay lắm nè, bạn xem thử:\n\n';

                for (const p of products.slice(0, 3)) {
                    const reason = this._generateProductReason(p, ctx);
                    response += kb.formatProductRecommendation(p, reason) + '\n';
                }

                if (primary) {
                    response += `\nCá nhân mình thấy **${primary.name}** khá dễ phối và vào form đẹp, bạn có thể bắt đầu từ món này.`;
                }

                response += '\nBạn thấy ưng mẫu nào thì nói mình, mình tư vấn thêm nha!';
                return response;
            }
            return (
                'Tiếc quá, mình chưa tìm được món nào khớp với yêu cầu của bạn.\n\n' +
                'Bạn thử đổi hướng một chút xem:\n' +
                '• Tìm theo brand: **Rick Owens**, **CDG**, **Yohji**\n' +
                '• Tìm theo loại: giày, áo khoác, túi\n' +
                '• Hoặc cho mình biết phong cách bạn thích, mình sẽ xem shop có gì hợp nhé!'
            );
        }

        // BRAND INFO
        if (intent === 'BRAND_INFO') {
            const brandInfo = enrichment.brand_info;
            if (brandInfo) {
                let response = `Ồ, **${brandInfo.name}** — brand này mình thích lắm luôn!\n\n`;
                response += `Xuất xứ: ${brandInfo.origin || ''}\n`;
                response += `Phong cách: ${brandInfo.style || ''}\n`;
                response += `Đặc trưng: ${brandInfo.signature || ''}\n`;
                response += `Tầm giá: ${brandInfo.price_range || ''}\n`;
                response += `Phù hợp cho: ${brandInfo.best_for || ''}\n\n`;
                response += `${brandInfo.description || ''}\n\n`;
                response += `Về size: ${brandInfo.fits || ''}\n\n`;

                let products = enrichment.products || [];
                if (!products.length && entities.brand) {
                    products = await productSearch.searchProducts({ brand: entities.brand, limit: 3 });
                }
                if (products.length) {
                    response += `Shop mình đang có mấy món **${brandInfo.name}** nè:\n\n`;
                    for (const p of products.slice(0, 3)) {
                        response += kb.formatProductRecommendation(p) + '\n';
                    }
                    response += 'Bạn muốn xem thêm về món nào không?';
                }
                return response;
            }
            return (
                'Mình rành mấy brand này lắm, bạn muốn tìm hiểu brand nào?\n\n' +
                '**Rick Owens**, **Acronym**, **CDG**, **Yohji Yamamoto**, **Issey Miyake**, ' +
                '**Maison Margiela**, **Raf Simons**, **Balenciaga**, **Fear of God**, **Undercover**\n\n' +
                'Cứ hỏi thoải mái, mình kể cho nghe!'
            );
        }

        // PRICE INQUIRY
        if (intent === 'PRICE_INQUIRY') {
            const products = enrichment.products || [];
            if (products.length) {
                const priceHint = entities.price_hint || 0;
                let response;
                if (priceHint) {
                    response = `Tầm ${priceHint.toLocaleString('vi-VN')}₫ thì mình có mấy lựa chọn khá ổn nè:\n\n`;
                } else {
                    response = 'Mình thấy mấy món này giá khá hợp lý, bạn tham khảo nha:\n\n';
                }
                for (const p of products.slice(0, 4)) {
                    const reason = this._generateProductReason(p, ctx);
                    response += kb.formatProductRecommendation(p, reason) + '\n';
                }
                response += 'Bạn thấy sao? Có muốn mình tìm thêm không?';
                return response;
            }
            return (
                'Bạn cho mình biết **ngân sách** tầm bao nhiêu nhỉ?\n' +
                "Kiểu 'tầm 15 triệu', 'dưới 20 triệu' gì đó là được.\n\n" +
                'Bên mình có đồ từ khoảng **5 triệu** đến **75 triệu** — tùy brand và dòng sản phẩm.'
            );
        }

        // STYLE ADVICE
        if (intent === 'STYLE_ADVICE') {
            const styleInfo = enrichment.style_advice;
            const products = enrichment.products || [];
            if (styleInfo) {
                let response = `**Phong cách ${styleInfo.name.charAt(0).toUpperCase() + styleInfo.name.slice(1)}** — hay lắm, để mình chia sẻ nhé!\n\n`;
                response += `${styleInfo.description || ''}\n\n`;
                response += 'Những item không thể thiếu:\n';
                for (const item of (styleInfo.key_items || [])) response += `  • ${item}\n`;
                response += '\nMấy tips phối đồ mình thấy hiệu quả:\n';
                for (const tip of (styleInfo.tips || [])) response += `  • ${tip}\n`;
                response += `\nHợp với: ${styleInfo.occasions || ''}\n`;
                response += `\nBrand nên để ý: ${(styleInfo.brands || []).join(', ')}\n`;
                if (products.length) {
                    response += '\nMà hay quá, shop mình đang có mấy món hợp style này:\n\n';
                    for (const p of products.slice(0, 3)) {
                        const reason = this._generateProductReason(p, ctx);
                        response += kb.formatProductRecommendation(p, reason) + '\n';
                    }
                }
                return response;
            }
            return (
                'Bạn đang hứng thú phong cách nào nhỉ? Mình rành mấy style này:\n\n' +
                '• **Avant-garde** — Rick Owens, Yohji, CDG\n' +
                '• **Techwear** — Acronym, chất liệu công nghệ\n' +
                '• **Streetwear** — Balenciaga, Fear of God, Off-White\n' +
                '• **Minimalist** — The Row, Lemaire, Issey Miyake\n\n' +
                'Hoặc bạn cho mình biết dịp mặc (đi chơi, công sở, party...) cũng được, mình sẽ gợi ý theo!'
            );
        }

        // SIZE HELP
        if (intent === 'SIZE_HELP' || intent === 'CUSTOMER_PROFILE') {
            if (enrichment.size_advice) return enrichment.size_advice;
            return kb.suggestSize(ctx.height_cm, ctx.weight_kg);
        }

        // INVENTORY CHECK
        if (intent === 'INVENTORY_CHECK') {
            const inventory = enrichment.inventory_summary || {};
            const products = enrichment.products || [];

            if (inventory && Object.keys(inventory).length) {
                const total = inventory.total_products || 0;
                const available = inventory.total_available || 0;
                const categories = inventory.categories || [];
                const brands = inventory.top_brands || [];
                const priceRange = inventory.price_range || {};

                let response = `Shop mình hiện đang có **${total} sản phẩm**, trong đó **${available} variant còn hàng** nha.\n\n`;

                if (categories.length) {
                    response += '**Theo danh mục:**\n';
                    for (const cat of categories) {
                        response += `  • ${cat.category || 'N/A'}: ${cat.product_count || 0} sản phẩm\n`;
                    }
                    response += '\n';
                }

                if (brands.length) {
                    response += '**Brands nổi bật:**\n';
                    for (const b of brands) {
                        response += `  • ${b.brand || 'N/A'}: ${b.product_count || 0} sản phẩm\n`;
                    }
                    response += '\n';
                }

                if (priceRange.min && priceRange.max) {
                    response += `**Tầm giá:** ${Math.floor(parseFloat(priceRange.min)).toLocaleString('vi-VN')}₫ – ${Math.floor(parseFloat(priceRange.max)).toLocaleString('vi-VN')}₫\n\n`;
                }

                if (products.length) {
                    response += 'Mấy món tiêu biểu nè:\n\n';
                    for (const p of products.slice(0, 3)) {
                        const reason = this._generateProductReason(p, ctx);
                        response += kb.formatProductRecommendation(p, reason) + '\n';
                    }
                }

                response += '\nBạn muốn mình tìm theo danh mục hoặc brand nào cụ thể không?';
                return response;
            }
            return (
                'Ấy, mình không lấy được thông tin kho hàng lúc này. Thông cảm nha!\n' +
                "Bạn cứ hỏi trực tiếp về sản phẩm (kiểu 'Tìm giày Rick Owens') " +
                'là mình tìm ngay cho!'
            );
        }

        // COUPON INQUIRY
        if (intent === 'COUPON_INQUIRY') {
            const coupons = enrichment.coupons || [];
            if (coupons.length) {
                let response = 'Có chứ bạn! Shop mình đang có mấy mã giảm giá nè:\n\n';
                for (const c of coupons) {
                    const typeLabel = c.type === 'PERCENTAGE'
                        ? `${c.value}%`
                        : c.type === 'FREE_SHIPPING'
                            ? 'Miễn phí vận chuyển'
                            : `${c.value.toLocaleString('vi-VN')}₫`;
                    const expiry = c.expires_at ? new Date(c.expires_at).toLocaleDateString('vi-VN') : 'Không giới hạn';
                    response += `• Mã **${c.code}** — ${c.type === 'FREE_SHIPPING' ? typeLabel : `Giảm **${typeLabel}**`}`;
                    if (c.max_discount_amount && c.type === 'FREE_SHIPPING') response += ` (giảm ship tối đa ${c.max_discount_amount.toLocaleString('vi-VN')}₫)`;
                    if (c.min_order_amount > 0) response += ` (đơn tối thiểu ${c.min_order_amount.toLocaleString('vi-VN')}₫)`;
                    response += ` | HSD: ${expiry}\n`;
                }
                response += '\nBạn chỉ cần nhập mã khi thanh toán là được nha! Muốn mình tìm đồ gì để dùng mã luôn không?';
                return response;
            }
            return (
                'Tiếc quá, hiện tại shop chưa có mã giảm giá nào đang hoạt động.\n\n' +
                'Nhưng mà mình có mấy món đang **sale** khá hấp dẫn lắm, bạn muốn xem không?'
            );
        }

        // CONSIGNMENT
        if (intent === 'CONSIGNMENT') return enrichment.policy || kb.STORE_POLICIES.consignment;

        // AUTHENTICITY
        if (intent === 'AUTHENTICITY') return enrichment.policy || kb.STORE_POLICIES.authenticity;

        // ORDER STATUS
        if (intent === 'ORDER_STATUS') {
            return (enrichment.policy || kb.STORE_POLICIES.shipping) +
                '\n\nĐể kiểm tra đơn hàng, bạn vào mục **Tài khoản → Đơn hàng** trên website là ra luôn nhé!';
        }

        // FALLBACK — check if user is giving profile info
        if (entities.height_cm || entities.weight_kg || entities.gender || entities.style) {
            let response = 'Oke mình ghi nhận rồi nha!\n';
            if (entities.height_cm) response += `  Cao: **${entities.height_cm}cm**\n`;
            if (entities.weight_kg) response += `  Nặng: **${entities.weight_kg}kg**\n`;
            if (entities.gender) response += `  Giới tính: **${entities.gender === 'male' ? 'Nam' : 'Nữ'}**\n`;
            if (entities.style) response += `  Phong cách: **${entities.style.join(', ')}**\n`;
            response += '\nVậy bạn đang muốn tìm món đồ nào? Mình sẽ gợi ý dựa trên thông số của bạn luôn!';

            if (ctx.height_cm || ctx.weight_kg) {
                const products = await productSearch.searchProducts({ limit: 3 });
                if (products.length) {
                    response += '\n\nNhân tiện, mấy món này mình thấy hợp với bạn nè:\n\n';
                    for (const p of products.slice(0, 3)) {
                        const reason = this._generateProductReason(p, ctx);
                        response += kb.formatProductRecommendation(p, reason) + '\n';
                    }
                }
            }
            return response;
        }

        return (
            'Mình có thể giúp bạn mấy việc này nè:\n\n' +
            "• **Tìm sản phẩm** — 'Tìm giày Rick Owens', 'Có áo khoác nào không?'\n" +
            "• **Tìm hiểu brand** — 'Kể về CDG', 'Yohji Yamamoto có gì hay?'\n" +
            "• **Tư vấn phong cách** — 'Style techwear', 'Phối đồ đi party'\n" +
            "• **Chọn size** — 'Cao 170 nặng 65 mặc size gì?'\n" +
            "• **Tìm theo giá** — 'Có gì tầm 15 triệu?'\n" +
            "• **Chính sách** — 'Ký gửi', 'Đổi trả', 'Vận chuyển'\n\n" +
            'Bạn cứ hỏi thoải mái nha, mình ở đây!'
        );
    }

    _generateProductReason(product, ctx) {
        const reasons = [];
        const brand = (product.brand || '').toLowerCase();

        if (ctx.height_cm) {
            if (ctx.height_cm < 170) reasons.push('Form dáng phù hợp với người nhỏ nhắn');
            else if (ctx.height_cm > 180) reasons.push('Cut dài vừa với chiều cao của bạn');
        }

        const styles = ctx.style || [];
        if (styles.includes('techwear') && ['acronym', 'rick owens'].includes(brand)) {
            reasons.push('Đúng phong cách techwear bạn thích');
        }
        if (styles.includes('minimalist') && ['the row', 'lemaire', 'issey miyake'].includes(brand)) {
            reasons.push('Phù hợp phong cách tối giản của bạn');
        }
        if (styles.includes('streetwear') && ['balenciaga', 'fear of god', 'off-white'].includes(brand)) {
            reasons.push('Đúng gu streetwear của bạn');
        }
        if (styles.includes('avant-garde') && ['rick owens', 'yohji yamamoto', 'comme des garçons'].includes(brand)) {
            reasons.push('Phong cách avant-garde bạn yêu thích');
        }

        if (ctx.color) {
            const variants = Array.isArray(product.variants) ? product.variants : [];
            if (variants.length > 0) {
                const v = variants[0];
                if (v && typeof v === 'object' && (v.color || '').toLowerCase() === ctx.color.toLowerCase()) {
                    reasons.push(`Màu ${ctx.color} như bạn thích`);
                }
            }
        }

        if (product.sale_price) reasons.push('Đang giảm giá');

        const condition = product.condition_text || '';
        if (condition.includes('10/10') || condition.includes('New')) reasons.push('Tình trạng mới 100%');
        else if (condition.includes('9/10')) reasons.push('Gần như mới, tình trạng tuyệt vời');

        return reasons.length ? reasons.join(' · ') : 'Sản phẩm chất lượng từ AURA ARCHIVE';
    }

    async getSessionHistory(sessionId) {
        const session = sessionMemory.getSession(sessionId);
        if (session) {
            return session.messages;
        }
        return [];
    }

    _cleanupExpiredSessions() {
        const expiredCount = sessionMemory.cleanupExpiredSessions();
        if (expiredCount) console.log(`[StylistEngine] Cleaned up ${expiredCount} expired sessions`);
    }

    /**
     * Smart context merge — only overwrite with non-empty new values,
     * and accumulate array fields (like style) instead of replacing.
     */
    _mergeContext(target, source) {
        if (!source || typeof source !== 'object') return;
        for (const [key, value] of Object.entries(source)) {
            if (value === null || value === undefined) continue;
            if (Array.isArray(value) && value.length === 0) continue;
            if (typeof value === 'string' && value.trim() === '') continue;

            // Accumulate style arrays instead of replacing
            if (key === 'style' && Array.isArray(value)) {
                const existing = Array.isArray(target[key]) ? target[key] : [];
                target[key] = [...new Set([...existing, ...value])];
            } else {
                target[key] = value;
            }
        }
    }

    /**
     * Check if we need discovery flow — i.e. customer wants products
     * but hasn't provided enough info for good recommendations.
     */
    _needsDiscoveryFlow(intent, entities, ctx, message) {
        // Only trigger for product-seeking intents
        const productIntents = ['PRODUCT_SEARCH', 'CATEGORY_BROWSE', 'STYLE_ADVICE'];
        if (!productIntents.includes(intent)) return false;

        // If customer explicitly wants to skip discovery ("tìm nhanh", "xem hết")
        const skipPhrases = ['tim nhanh', 'xem het', 'xem tat ca', 'show all', 'tat ca'];
        const normalized = normalizeForMatching(message);
        if (skipPhrases.some(p => normalized.includes(p))) return false;

        // Check if we have minimum info: at least height/weight OR explicit size
        const hasBodyInfo = !!(ctx.height_cm || ctx.weight_kg);
        const hasSize = !!(entities.size || ctx.size);
        // Need at least body info OR size to give good recommendations
        if (!hasBodyInfo && !hasSize) return true;

        return false;
    }

    /**
     * API call with retry logic — retries once on failure before falling back to trained.
     */
    async _generateApiResponseWithRetry(message, session, intent, entities, enrichment, systemPrompt, retries = 1) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await this._generateApiResponse(message, session, intent, entities, enrichment, systemPrompt);
            } catch (e) {
                console.log(`[StylistEngine] API attempt ${attempt + 1} failed: ${e.message}`);
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    continue;
                }
                // Final fallback to trained response
                console.log('[StylistEngine] All API attempts failed, falling back to trained response');
                return await this._generateTrainedResponse(message, session, intent, entities, enrichment);
            }
        }
    }
}

// Singleton instance
let engineInstance = null;

function getEngine() {
    if (!engineInstance) {
        engineInstance = new StylistEngine();
    }
    return engineInstance;
}

module.exports = { StylistEngine, getEngine };
