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

const { classifyIntent, extractEntities, extractSearchQuery } = require('./intent-classifier');
const kb = require('./knowledge-base');
const productSearch = require('./product-search');

const SESSION_TTL = 30 * 60 * 1000; // 30 minutes in ms

class StylistEngine {
    constructor() {
        this.openaiClient = null;
        this.geminiModel = null;
        this.hasApi = false;
        this.mode = process.env.CHATBOT_MODE || 'auto';
        this.sessions = new Map();

        // Initialize Gemini
        if (process.env.GEMINI_API_KEY) {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                this.geminiModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
                this.hasApi = true;
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

        this.systemPromptTemplate = `Bạn là AURA, một stylist thời trang AI chuyên nghiệp cho AURA ARCHIVE — một nền tảng mua bán đồ hiệu secondhand (consignment).

Vai trò của bạn:
- Tư vấn thời trang cá nhân hóa dựa trên thông tin khách hàng (chiều cao, cân nặng, phong cách)
- Giới thiệu sản phẩm CỤ THỂ từ kho hàng (luôn kèm link dạng [Xem chi tiết](/shop/slug))
- Giải thích TẠI SAO sản phẩm phù hợp với khách hàng
- Hỏi khéo thông tin để tư vấn tốt hơn (chiều cao, cân nặng, phong cách, dịp mặc)
- Trả lời câu hỏi về kho hàng (số lượng, danh mục, brand) dựa trên CONTEXT DATA

Phong cách giao tiếp:
- Nói chuyện tự nhiên như một người bạn am hiểu thời trang, KHÔNG nói kiểu robot
- Trả lời bằng tiếng Việt (trừ khi khách nói tiếng Anh)
- Ngắn gọn nhưng đầy đủ thông tin
- KHÔNG dùng emoji, giữ giọng văn chuyên nghiệp và tinh tế
- Khi giới thiệu sản phẩm, luôn kèm link dạng markdown: [Xem chi tiết](/shop/slug)
- CHỈ giới thiệu sản phẩm có tình trạng "CON HANG". KHÔNG giới thiệu sản phẩm "HET HANG" hoặc "Da ban".

Quy tắc định dạng (QUAN TRỌNG):
- Dùng **in đậm** cho tên sản phẩm, tên brand, câu hỏi quan trọng, và thông tin nổi bật
- Ví dụ: **Chiều cao và cân nặng của bạn là bao nhiêu?**, **Rick Owens Geobasket**, **15.000.000₫**
- Dùng danh sách có số thứ tự khi hỏi nhiều câu hỏi
- KHÔNG viết hoa toàn bộ từ, dùng **bold** thay cho CAPS

QUY TẮC BẮT BUỘC — TUYỆT ĐỐI KHÔNG ĐƯỢC VI PHẠM:
1. TUYỆT ĐỐI KHÔNG ĐƯỢC BỊA hoặc TỰ NGHĨ RA sản phẩm. Bạn CHỈ ĐƯỢC giới thiệu sản phẩm có trong phần "SẢN PHẨM TÌM ĐƯỢC" ở CONTEXT DATA bên dưới.
2. Nếu CONTEXT DATA không có sản phẩm nào, bạn PHẢI nói rằng hiện tại shop chưa có sản phẩm phù hợp với yêu cầu, và hỏi khách có muốn tìm kiếm theo tiêu chí khác không.
3. KHÔNG ĐƯỢC tự tạo tên sản phẩm, giá, link, size, hoặc bất kỳ thông tin sản phẩm nào không có trong CONTEXT DATA.
4. Chỉ sử dụng link sản phẩm (format: /shop/slug) từ CONTEXT DATA. KHÔNG ĐƯỢC tự tạo link.
5. TUYỆT ĐỐI KHÔNG ĐƯỢC lấy thông tin từ internet, từ kiến thức chung, hay từ bất kỳ nguồn nào bên ngoài CONTEXT DATA.
6. TUYỆT ĐỐI KHÔNG ĐƯỢC đoán, phỏng đoán, hay suy luận về sản phẩm/số lượng nếu không có trong CONTEXT DATA.
7. Nếu không có dữ liệu trong CONTEXT DATA để trả lời, hãy nói thật rằng bạn không có thông tin đó và đề nghị khách thử tìm kiếm khác.
8. Khi trả lời về kho hàng/tồn kho, CHỈ sử dụng số liệu từ phần "TỔNG QUAN KHO HÀNG" trong CONTEXT DATA.
9. Nếu chưa biết thông tin khách hàng, HỎI trước khi tư vấn
10. Giới thiệu 2-4 sản phẩm mỗi lần, giải thích tại sao phù hợp
11. Đề cập giá, size, tình trạng sản phẩm
12. Khi hỏi thông tin, hỏi từng bước một, KHÔNG hỏi quá nhiều cùng lúc

NHẮC LẠI: Mọi thông tin bạn cung cấp PHẢI đến từ CONTEXT DATA bên dưới. Nếu CONTEXT DATA không chứa thông tin, bạn KHÔNG CÓ thông tin đó.`;

        console.log(`[StylistEngine] Initialized — API: ${this.hasApi ? '✓' : '✗'}, Mode: ${this.mode}`);
    }

    async processMessage(message, sessionId, userId = null, context = null, systemPrompt = null) {
        this._cleanupExpiredSessions();

        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                messages: [],
                context: {},
                lastAccess: Date.now(),
            });
        }

        const session = this.sessions.get(sessionId);
        session.lastAccess = Date.now();
        session.messages.push({ role: 'user', content: message });

        // Step 1: Classify intent
        const [intent, confidence] = classifyIntent(message);

        // Step 2: Extract entities
        const entities = extractEntities(message);
        Object.assign(session.context, entities);

        // Step 3: Enrich with product data & knowledge
        const enrichment = await this._enrichContext(intent, entities, session.context, message);

        // Step 4: Generate response (hybrid)
        const useApi = this.hasApi && this.mode !== 'trained_only';

        let responseText;
        if (useApi) {
            responseText = await this._generateApiResponse(message, session, intent, entities, enrichment, systemPrompt);
        } else {
            responseText = await this._generateTrainedResponse(message, session, intent, entities, enrichment);
        }

        session.messages.push({ role: 'assistant', content: responseText });

        return {
            message: responseText,
            metadata: {
                intent,
                confidence,
                entities,
                mode: useApi ? 'api' : 'trained',
                has_products: !!(enrichment.products && enrichment.products.length),
            },
        };
    }

    async _enrichContext(intent, entities, sessionContext, message) {
        const enrichment = {};

        const shouldSearchProducts = (
            ['PRODUCT_SEARCH', 'CATEGORY_BROWSE', 'PRICE_INQUIRY', 'STYLE_ADVICE', 'INVENTORY_CHECK'].includes(intent)
            || 'category' in entities
            || 'brand' in entities
            || 'color' in entities
        );

        if (shouldSearchProducts) {
            const searchQuery = extractSearchQuery(message, entities);
            let products = await productSearch.searchProducts({
                search: searchQuery,
                category: entities.category,
                brand: entities.brand,
                color: entities.color,
                minPrice: entities.price_hint ? Math.floor(entities.price_hint * 0.7) : null,
                maxPrice: entities.price_hint ? Math.floor(entities.price_hint * 1.3) : null,
                limit: 5,
            });

            if (!products.length && (entities.category || entities.brand)) {
                console.log('[StylistEngine] Strict search returned 0 results, trying broader search...');
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

        return enrichment;
    }

    async _generateApiResponse(message, session, intent, entities, enrichment, customSystemPrompt) {
        const prompt = customSystemPrompt || this.systemPromptTemplate;
        const contextParts = [prompt, '\n\n--- CONTEXT DATA ---'];

        if (enrichment.products && enrichment.products.length) {
            contextParts.push(`\n📦 SẢN PHẨM TÌM ĐƯỢC:\n${enrichment.product_context}`);
            contextParts.push('\n⚠️ NHẮC LẠI: Bạn CHỈ ĐƯỢC giới thiệu các sản phẩm ở danh sách trên. KHÔNG ĐƯỢC bịa thêm sản phẩm nào khác.');
        } else {
            contextParts.push(
                '\n📦 SẢN PHẨM TÌM ĐƯỢC: KHÔNG CÓ sản phẩm nào phù hợp trong kho hàng.\n' +
                '⛔ NGHIÊM CẤM: KHÔNG ĐƯỢC bịa ra sản phẩm. Hãy nói với khách rằng hiện tại shop chưa có sản phẩm phù hợp, ' +
                'và hỏi khách có muốn thử tiêu chí khác không (ví dụ: brand khác, loại khác, giá khác).'
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

        // Customer profile
        const ctx = session.context || {};
        const profileParts = [];
        if (ctx.height_cm) profileParts.push(`Cao: ${ctx.height_cm}cm`);
        if (ctx.weight_kg) profileParts.push(`Nặng: ${ctx.weight_kg}kg`);
        if (ctx.gender) profileParts.push(`Giới tính: ${ctx.gender}`);
        if (ctx.style) profileParts.push(`Style: ${Array.isArray(ctx.style) ? ctx.style.join(', ') : ctx.style}`);
        if (ctx.color) profileParts.push(`Màu yêu thích: ${ctx.color}`);
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

        // Build message history (last 10)
        const messages = [{ role: 'system', content: fullSystemPrompt }];
        messages.push(...session.messages.slice(-10));

        try {
            if (this.geminiModel) {
                return await this._callGemini(messages);
            } else if (this.openaiClient) {
                return await this._callOpenai(messages);
            }
            return await this._generateTrainedResponse(messages[messages.length - 1].content, session, intent, entities, enrichment);
        } catch (e) {
            console.log(`[StylistEngine] API error: ${e.message}`);
            return await this._generateTrainedResponse(message, session, intent, entities, enrichment);
        }
    }

    async _callGemini(messages) {
        const systemMsg = messages[0]?.role === 'system' ? messages[0].content : '';
        const history = messages.slice(1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        const chat = this.geminiModel.startChat({
            history: history.length > 1 ? history.slice(0, -1) : [],
        });

        const lastMsg = history.length > 0 ? history[history.length - 1].parts[0].text : '';
        const fullPrompt = systemMsg ? `${systemMsg}\n\n---\nUser message: ${lastMsg}` : lastMsg;

        const result = await chat.sendMessage(fullPrompt);
        return result.response.text();
    }

    async _callOpenai(messages) {
        const completion = await this.openaiClient.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages,
            max_tokens: 800,
            temperature: 0.7,
        });
        return completion.choices[0].message.content;
    }

    async _generateTrainedResponse(message, session, intent, entities, enrichment) {
        const ctx = session.context || {};

        // GREETING
        if (intent === 'GREETING') {
            return (
                'Chào bạn, mình là AURA — trợ lý thời trang của AURA ARCHIVE.\n\n' +
                'Mình có thể giúp bạn:\n' +
                '• Tìm kiếm sản phẩm designer\n' +
                '• Tư vấn phong cách phù hợp\n' +
                '• Hướng dẫn chọn size\n' +
                '• Giới thiệu các thương hiệu\n\n' +
                'Để mình tư vấn tốt nhất, bạn cho mình biết **chiều cao, cân nặng** và **phong cách yêu thích** nhé!'
            );
        }

        // FAREWELL
        if (intent === 'FAREWELL') {
            return (
                'Cảm ơn bạn đã ghé thăm AURA ARCHIVE!\n' +
                'Nếu cần tư vấn thêm, cứ nhắn tin cho mình bất cứ lúc nào nhé.\n' +
                'Chúc bạn tìm được item ưng ý.'
            );
        }

        // PRODUCT SEARCH
        if (intent === 'PRODUCT_SEARCH' || intent === 'CATEGORY_BROWSE') {
            const products = enrichment.products || [];
            if (products.length) {
                let response = 'Mình tìm được những sản phẩm này cho bạn:\n\n';
                for (const p of products.slice(0, 4)) {
                    const reason = this._generateProductReason(p, ctx);
                    response += kb.formatProductRecommendation(p, reason) + '\n';
                }
                const missing = kb.getMissingProfileFields(ctx);
                if (missing.length) {
                    response += '\nĐể tư vấn chính xác hơn, ';
                    if (missing.includes('height_cm') || missing.includes('weight_kg')) {
                        response += 'bạn cho mình biết **chiều cao** và **cân nặng** nhé!';
                    } else if (missing.includes('style')) {
                        response += 'bạn thích **phong cách** nào? (minimalist, streetwear, techwear, avant-garde)';
                    }
                }
                return response;
            }
            return (
                'Mình chưa tìm thấy sản phẩm phù hợp với yêu cầu của bạn.\n\n' +
                'Bạn có thể thử:\n' +
                '• Tìm theo brand: **Rick Owens**, **CDG**, **Yohji**\n' +
                '• Tìm theo loại: giày, áo khoác, túi\n' +
                '• Tìm theo giá: tầm 15 triệu\n\n' +
                'Hoặc cho mình biết phong cách bạn thích, mình sẽ gợi ý nhé!'
            );
        }

        // BRAND INFO
        if (intent === 'BRAND_INFO') {
            const brandInfo = enrichment.brand_info;
            if (brandInfo) {
                let response = `**${brandInfo.name}**\n\n`;
                response += `Xuất xứ: ${brandInfo.origin || ''}\n`;
                response += `Phong cách: ${brandInfo.style || ''}\n`;
                response += `Đặc trưng: ${brandInfo.signature || ''}\n`;
                response += `Tầm giá: ${brandInfo.price_range || ''}\n`;
                response += `Phù hợp: ${brandInfo.best_for || ''}\n\n`;
                response += `${brandInfo.description || ''}\n\n`;
                response += `Hướng dẫn size: ${brandInfo.fits || ''}\n\n`;

                let products = enrichment.products || [];
                if (!products.length && entities.brand) {
                    products = await productSearch.searchProducts({ brand: entities.brand, limit: 3 });
                }
                if (products.length) {
                    response += `Sản phẩm **${brandInfo.name}** đang có:\n\n`;
                    for (const p of products.slice(0, 3)) {
                        response += kb.formatProductRecommendation(p) + '\n';
                    }
                }
                return response;
            }
            return (
                'Mình có thông tin chi tiết về các brand sau:\n' +
                '**Rick Owens**, **Acronym**, **CDG**, **Yohji Yamamoto**, **Issey Miyake**, ' +
                '**Maison Margiela**, **Raf Simons**, **Balenciaga**, **Fear of God**, **Undercover**\n\n' +
                'Bạn muốn tìm hiểu về brand nào?'
            );
        }

        // PRICE INQUIRY
        if (intent === 'PRICE_INQUIRY') {
            const products = enrichment.products || [];
            if (products.length) {
                const priceHint = entities.price_hint || 0;
                let response;
                if (priceHint) {
                    response = `Với tầm giá ${priceHint.toLocaleString('vi-VN')}₫, mình có những lựa chọn sau:\n\n`;
                } else {
                    response = 'Đây là một số sản phẩm với giá tốt:\n\n';
                }
                for (const p of products.slice(0, 4)) {
                    const reason = this._generateProductReason(p, ctx);
                    response += kb.formatProductRecommendation(p, reason) + '\n';
                }
                return response;
            }
            return (
                'Bạn cho mình biết **ngân sách** tầm bao nhiêu nhé!\n' +
                "Ví dụ: 'tầm 15 triệu', 'dưới 20 triệu', '$500'\n\n" +
                'AURA ARCHIVE có sản phẩm từ khoảng **5 triệu** đến **75 triệu VND**.'
            );
        }

        // STYLE ADVICE
        if (intent === 'STYLE_ADVICE') {
            const styleInfo = enrichment.style_advice;
            const products = enrichment.products || [];
            if (styleInfo) {
                let response = `**Phong cách ${styleInfo.name.charAt(0).toUpperCase() + styleInfo.name.slice(1)}**\n\n`;
                response += `${styleInfo.description || ''}\n\n`;
                response += 'Key items:\n';
                for (const item of (styleInfo.key_items || [])) response += `  • ${item}\n`;
                response += '\nTips phối đồ:\n';
                for (const tip of (styleInfo.tips || [])) response += `  • ${tip}\n`;
                response += `\nPhù hợp: ${styleInfo.occasions || ''}\n`;
                response += `\nBrands gợi ý: ${(styleInfo.brands || []).join(', ')}\n`;
                if (products.length) {
                    response += '\nSản phẩm gợi ý:\n\n';
                    for (const p of products.slice(0, 3)) {
                        const reason = this._generateProductReason(p, ctx);
                        response += kb.formatProductRecommendation(p, reason) + '\n';
                    }
                }
                return response;
            }
            return (
                'Mình có thể tư vấn các phong cách:\n\n' +
                '• **Avant-garde** — Rick Owens, Yohji, CDG\n' +
                '• **Techwear** — Acronym, technical fabrics\n' +
                '• **Streetwear** — Balenciaga, Fear of God, Off-White\n' +
                '• **Minimalist** — The Row, Lemaire, Issey Miyake\n\n' +
                'Bạn thích phong cách nào? Hoặc cho mình biết dịp mặc (đi chơi, công sở, party...) ' +
                'để mình tư vấn phù hợp nhé!'
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

                let response = `Hiện tại AURA ARCHIVE đang có **${total} sản phẩm** với **${available} variant còn hàng**.\n\n`;

                if (categories.length) {
                    response += '**Phân loại theo danh mục:**\n';
                    for (const cat of categories) {
                        response += `  • ${cat.category || 'N/A'}: ${cat.product_count || 0} sản phẩm\n`;
                    }
                    response += '\n';
                }

                if (brands.length) {
                    response += '**Top brands đang có:**\n';
                    for (const b of brands) {
                        response += `  • ${b.brand || 'N/A'}: ${b.product_count || 0} sản phẩm\n`;
                    }
                    response += '\n';
                }

                if (priceRange.min && priceRange.max) {
                    response += `**Tầm giá:** ${Math.floor(parseFloat(priceRange.min)).toLocaleString('vi-VN')}₫ – ${Math.floor(parseFloat(priceRange.max)).toLocaleString('vi-VN')}₫\n\n`;
                }

                if (products.length) {
                    response += 'Một số sản phẩm tiêu biểu:\n\n';
                    for (const p of products.slice(0, 3)) {
                        const reason = this._generateProductReason(p, ctx);
                        response += kb.formatProductRecommendation(p, reason) + '\n';
                    }
                }

                response += '\nBạn muốn tìm sản phẩm thuộc danh mục hoặc brand nào cụ thể?';
                return response;
            }
            return (
                'Xin lỗi, mình không thể lấy thông tin kho hàng lúc này.\n' +
                "Bạn có thể thử hỏi về sản phẩm cụ thể (ví dụ: 'Tìm giày Rick Owens') " +
                'và mình sẽ tìm trong kho nhé!'
            );
        }

        // CONSIGNMENT
        if (intent === 'CONSIGNMENT') return enrichment.policy || kb.STORE_POLICIES.consignment;

        // AUTHENTICITY
        if (intent === 'AUTHENTICITY') return enrichment.policy || kb.STORE_POLICIES.authenticity;

        // ORDER STATUS
        if (intent === 'ORDER_STATUS') {
            return (enrichment.policy || kb.STORE_POLICIES.shipping) +
                '\n\nĐể kiểm tra đơn hàng, bạn vào mục **Tài khoản → Đơn hàng** trên website nhé!';
        }

        // FALLBACK — check if user is giving profile info
        if (entities.height_cm || entities.weight_kg || entities.gender || entities.style) {
            let response = 'Cảm ơn bạn đã chia sẻ! Mình đã ghi nhận:\n';
            if (entities.height_cm) response += `  Chiều cao: **${entities.height_cm}cm**\n`;
            if (entities.weight_kg) response += `  Cân nặng: **${entities.weight_kg}kg**\n`;
            if (entities.gender) response += `  Giới tính: **${entities.gender === 'male' ? 'Nam' : 'Nữ'}**\n`;
            if (entities.style) response += `  Phong cách: **${entities.style.join(', ')}**\n`;
            response += '\nBạn muốn mình tìm sản phẩm gì? Hoặc cho mình biết thêm sở thích để tư vấn nhé!';

            if (ctx.height_cm || ctx.weight_kg) {
                const products = await productSearch.searchProducts({ limit: 3 });
                if (products.length) {
                    response += '\n\nMột vài gợi ý cho bạn:\n\n';
                    for (const p of products.slice(0, 3)) {
                        const reason = this._generateProductReason(p, ctx);
                        response += kb.formatProductRecommendation(p, reason) + '\n';
                    }
                }
            }
            return response;
        }

        return (
            'Mình có thể giúp bạn:\n\n' +
            "• **Tìm sản phẩm**: 'Tìm giày Rick Owens', 'Có áo khoác nào không?'\n" +
            "• **Tìm hiểu brand**: 'Giới thiệu về CDG', 'Kể về Yohji'\n" +
            "• **Tư vấn phong cách**: 'Style techwear', 'Phối đồ đi party'\n" +
            "• **Chọn size**: 'Cao 170 nặng 65 mặc size gì?'\n" +
            "• **Tìm theo giá**: 'Có gì tầm 15 triệu?'\n" +
            "• **Chính sách**: 'Ký gửi', 'Đổi trả', 'Vận chuyển'\n\n" +
            'Hãy cho mình biết bạn đang tìm gì nhé!'
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
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccess = Date.now();
            return session.messages;
        }
        return [];
    }

    _cleanupExpiredSessions() {
        const now = Date.now();
        const expired = [];
        for (const [sid, data] of this.sessions.entries()) {
            if (now - (data.lastAccess || 0) > SESSION_TTL) expired.push(sid);
        }
        for (const sid of expired) this.sessions.delete(sid);
        if (expired.length) console.log(`[StylistEngine] Cleaned up ${expired.length} expired sessions`);
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
