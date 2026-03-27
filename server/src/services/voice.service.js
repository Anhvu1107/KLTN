/**
 * Voice Service
 * AURA ARCHIVE - Real-time voice AI using Gemini Live API
 * Handles session config and tool call execution
 */

const { SystemPrompt } = require('../models');
const productSearch = require('./ai/product-search');
const logger = require('../utils/logger');

/**
 * Build system prompt optimized for voice conversations
 */
const buildVoiceSystemPrompt = async () => {
    let persona = null;
    try {
        const prompt = await SystemPrompt.findOne({
            where: { key: 'STYLIST_PERSONA', is_active: true },
        });
        persona = prompt?.content || null;
    } catch (error) {
        logger.error('Failed to fetch AI persona for voice:', error);
    }

    const voicePrompt = persona || `Bạn là AURA, stylist thời trang AI chuyên nghiệp cho AURA ARCHIVE — nền tảng mua bán đồ hiệu secondhand.

Vai trò:
- Tư vấn thời trang cá nhân hóa cho khách hàng
- Giới thiệu sản phẩm CỤ THỂ từ kho hàng bằng cách gọi function search_products
- Giải thích TẠI SAO sản phẩm phù hợp với khách
- Hỏi khéo thông tin (chiều cao, cân nặng, phong cách, dịp mặc) để tư vấn tốt hơn

Phong cách giao tiếp (QUAN TRỌNG vì đây là voice chat):
- Nói chuyện tự nhiên, thân thiện, như một người bạn am hiểu thời trang
- Trả lời bằng tiếng Việt (trừ khi khách nói tiếng Anh)
- Ngắn gọn, súc tích vì đây là hội thoại bằng giọng nói
- KHÔNG dùng markdown, link, emoji vì người dùng NGHE chứ không đọc
- Khi giới thiệu sản phẩm, đọc tên và giá, nói tóm tắt đặc điểm
- Nhiệt huyết, hiểu tâm lý khách hàng, tư vấn như một tư vấn viên chuyên nghiệp
- Giọng điệu ấm áp, chân thành, không máy móc

Quy tắc:
- TUYỆT ĐỐI KHÔNG bịa sản phẩm. Luôn dùng function search_products để tìm sản phẩm thật
- Nếu không tìm thấy sản phẩm phù hợp, nói thật và đề nghị tiêu chí khác
- Giới thiệu 2-3 sản phẩm mỗi lần, đề cập giá và tình trạng
- Hỏi từng phần, không hỏi quá nhiều cùng lúc
- CHỈ trả lời các câu hỏi liên quan đến THỜI TRANG, sản phẩm, phong cách, trang phục
- Nếu khách hỏi ngoài chủ đề (toán, khoa học, chính trị, v.v.), LỊCH SỰ từ chối và dẫn dắt về thời trang. Ví dụ: "Mình chuyên về thời trang thôi nha! Để mình tư vấn outfit cho bạn nhé?"
- KHÔNG BAO GIỜ trả lời câu hỏi không liên quan đến thời trang hoặc sản phẩm của shop

Kỹ năng bán hàng:
- Khi khách thích sản phẩm, gọi navigate_to_product để mở trang sản phẩm (mở tab mới, cuộc gọi vẫn tiếp tục)
- Sau khi mở sản phẩm, nói: "Mình đã mở trang sản phẩm cho bạn rồi, bạn xem và bấm Thêm vào giỏ hàng nhé!"
- Chủ động hỏi: "Bạn muốn mình tìm thêm sản phẩm nào nữa không?"
- Tạo cảm giác khan hiếm khi phù hợp: "Sản phẩm này chỉ còn 1 cái thôi nha"
- Gợi ý mix đồ: "Nếu bạn lấy áo này thì kết hợp với quần này rất đẹp"`;

    return voicePrompt;
};

/**
 * Get function declarations for Gemini Live tool calling
 */
const getToolDeclarations = () => {
    return [
        {
            name: 'search_products',
            description: 'Tìm kiếm sản phẩm trong kho hàng AURA ARCHIVE. Gọi function này khi khách hỏi về sản phẩm, muốn xem đồ, hoặc cần tư vấn.',
            parameters: {
                type: 'object',
                properties: {
                    search: {
                        type: 'string',
                        description: 'Từ khóa tìm kiếm tự do (ví dụ: "giày cao cổ", "áo khoác")',
                    },
                    brand: {
                        type: 'string',
                        description: 'Tên thương hiệu (ví dụ: "Rick Owens", "CDG", "Balenciaga")',
                    },
                    category: {
                        type: 'string',
                        description: 'Danh mục sản phẩm. PHẢI dùng giá trị tiếng Anh: "Shoes" (Giày), "Bags" (Túi), "Tops" (Áo), "Pants" (Quần), "Outerwear" (Áo khoác), "Accessories" (Phụ kiện). Ví dụ: khách nói "túi" → truyền "Bags"',
                    },
                    minPrice: {
                        type: 'number',
                        description: 'Giá tối thiểu (VND)',
                    },
                    maxPrice: {
                        type: 'number',
                        description: 'Giá tối đa (VND)',
                    },
                },
            },
        },
        {
            name: 'get_inventory_summary',
            description: 'Xem tổng quan kho hàng: tổng số sản phẩm, phân loại theo brand và category, tầm giá. Gọi khi khách hỏi "shop có những gì", "có bao nhiêu sản phẩm".',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'navigate_to_product',
            description: 'Mở trang sản phẩm cho khách xem chi tiết. Gọi khi khách nói "cho tôi xem", "mở sản phẩm đó", "xem chi tiết" hoặc muốn xem sản phẩm cụ thể.',
            parameters: {
                type: 'object',
                properties: {
                    slug: {
                        type: 'string',
                        description: 'Slug của sản phẩm (lấy từ kết quả search_products)',
                    },
                    name: {
                        type: 'string',
                        description: 'Tên sản phẩm để thông báo cho khách',
                    },
                },
                required: ['slug'],
            },
        },
    ];
};

/**
 * Execute a tool call from Gemini Live API
 */
const executeToolCall = async (toolName, args = {}) => {
    try {
        switch (toolName) {
        case 'search_products': {
            const products = await productSearch.searchProducts({
                search: args.search || null,
                brand: args.brand || null,
                category: args.category || null,
                minPrice: args.minPrice || null,
                maxPrice: args.maxPrice || null,
                limit: 5,
            });

            if (!products.length) {
                return { found: 0, message: 'Không tìm thấy sản phẩm phù hợp.' };
            }

            return {
                found: products.length,
                products: products.map(p => ({
                    name: p.name || 'Unknown',
                    brand: p.brand || '',
                    price: p.base_price ? `${Math.floor(parseFloat(p.base_price)).toLocaleString('vi-VN')}₫` : '',
                    sale_price: p.sale_price ? `${Math.floor(parseFloat(p.sale_price)).toLocaleString('vi-VN')}₫` : null,
                    category: p.category || '',
                    condition: p.condition_text || '',
                    slug: p.slug || '',
                    variants: (Array.isArray(p.variants) ? p.variants : []).map(v => ({
                        size: v.size || '',
                        color: v.color || '',
                        status: v.status === 'AVAILABLE' ? 'Còn hàng' : v.status === 'SOLD' ? 'Đã bán' : 'Đang giữ',
                    })),
                })),
            };
        }

        case 'get_inventory_summary': {
            const summary = await productSearch.getInventorySummary();
            if (!summary || !Object.keys(summary).length) {
                return { message: 'Không thể lấy thông tin kho hàng lúc này.' };
            }
            return {
                total_products: summary.total_products || 0,
                total_available: summary.total_available || 0,
                categories: (summary.categories || []).map(c => ({
                    name: c.category,
                    count: c.product_count,
                })),
                top_brands: (summary.top_brands || []).map(b => ({
                    name: b.brand,
                    count: b.product_count,
                })),
                price_range: summary.price_range || {},
            };
        }

        default:
            return { error: `Unknown tool: ${toolName}` };
        }
    } catch (error) {
        logger.error(`Voice tool call error (${toolName}):`, error.message);
        return { error: 'Xin lỗi, không thể truy vấn dữ liệu lúc này.' };
    }
};

/**
 * Get voice session config
 * Returns API key + config for frontend to connect directly to Gemini Live API
 */
const getVoiceConfig = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const systemPrompt = await buildVoiceSystemPrompt();

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
