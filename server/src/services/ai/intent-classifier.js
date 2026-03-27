/**
 * Intent Classifier
 * AURA ARCHIVE - Phân loại ý định người dùng (VI + EN)
 * Hỗ trợ extract entities: brand, category, size, price range, style
 * 
 * Ported from Python ai_service/app/services/intent_classifier.py
 */

// =====================================================
// INTENT DEFINITIONS
// =====================================================

const INTENTS = {
    GREETING: {
        patterns: [
            /\b(hello|hi|hey|xin chào|chào|alo|helu|chào bạn|chào shop)\b/i,
            /^(hi|hello|hey|chào)[\s!.]*$/i,
        ],
        priority: 10,
    },
    FAREWELL: {
        patterns: [
            /\b(bye|goodbye|tạm biệt|cảm ơn|thank|thanks|cám ơn|ok cảm ơn|bye bye)\b/i,
            /\b(hẹn gặp lại|see you|have a nice day)\b/i,
        ],
        priority: 10,
    },
    PRODUCT_SEARCH: {
        patterns: [
            /\b(tìm|tìm kiếm|search|find|show|xem|có không|có .+ không|kiếm|muốn mua|muốn xem)\b/i,
            /\b(recommend|gợi ý|đề xuất|giới thiệu sản phẩm|sp nào|sản phẩm nào)\b/i,
            /\b(có gì|hàng mới|new arrival|mới về|hàng về)\b/i,
        ],
        priority: 8,
    },
    BRAND_INFO: {
        patterns: [
            /\b(kể về|giới thiệu về|tell me about|about|info|thông tin|brand|thương hiệu)\b/i,
            /\b(lịch sử|history|story|câu chuyện)\b.*\b(brand|thương hiệu|hãng)\b/i,
        ],
        priority: 7,
    },
    PRICE_INQUIRY: {
        patterns: [
            /\b(giá|bao nhiêu|price|cost|budget|tầm giá|khoảng giá|trong khoảng)\b/i,
            /\b(rẻ|đắt|cheap|expensive|affordable|tiết kiệm|sale|giảm giá|khuyến mãi)\b/i,
            /\d+\s*(triệu|tr|k|nghìn|million|usd|\$|đồng|vnđ|vnd)/i,
        ],
        priority: 8,
    },
    STYLE_ADVICE: {
        patterns: [
            /\b(phối|mix|match|mặc gì|wear|outfit|style|phong cách|trend)\b/i,
            /\b(kết hợp|combine|coordination|phối đồ|mix đồ|layer)\b/i,
            /\b(đi dự|đi làm|đi chơi|đi học|occasion|sự kiện|party|date|công sở)\b/i,
            /\b(đẹp|nên mặc|nên mua|hợp|suitable|recommend)\b/i,
        ],
        priority: 7,
    },
    SIZE_HELP: {
        patterns: [
            /\b(size|cỡ|kích thước|fit|vừa|rộng|chật|form)\b/i,
            /\b(chiều cao|cao|height|weight|cân nặng|nặng|kg|cm)\b/i,
            /\d+\s*(kg|cm|m)\b/i,
        ],
        priority: 8,
    },
    CUSTOMER_PROFILE: {
        patterns: [
            /\b(cao|nặng|da|màu da|skin|tone|body|dáng|người|thân hình)\b/i,
            /\b(thích|like|prefer|yêu thích|gu|taste)\b.*\b(style|phong cách|kiểu|thời trang)\b/i,
            /\b(tuổi|age|năm sinh|gender|giới tính|nam|nữ|male|female)\b/i,
        ],
        priority: 6,
    },
    CONSIGNMENT: {
        patterns: [
            /\b(ký gửi|consign|consignment|bán|sell|bán đồ|gửi bán)\b/i,
            /\b(muốn bán|want to sell|listing|đăng bán)\b/i,
        ],
        priority: 7,
    },
    ORDER_STATUS: {
        patterns: [
            /\b(đơn hàng|order|tracking|theo dõi|giao hàng|shipping|vận chuyển)\b/i,
            /\b(trạng thái|status|khi nào|when|delivery|nhận hàng)\b/i,
            /\b(đổi trả|return|refund|hoàn tiền|bảo hành)\b/i,
        ],
        priority: 7,
    },
    CATEGORY_BROWSE: {
        patterns: [
            /\b(shoes|giày|sneaker|boot|dép|sandal)\b/i,
            /\b(áo|shirt|top|hoodie|sweater|jacket|bomber|coat|khoác|blazer|outerwear)\b/i,
            /\b(quần|pants|trousers|jeans|shorts|cargo)\b/i,
            /\b(túi|bag|bags|tote|backpack|crossbody|clutch)\b/i,
            /\b(váy|dress|dresses|đầm|skirt)\b/i,
            /\b(phụ kiện|accessories|belt|nón|hat|cap|thắt lưng|kính|glasses|jewelry)\b/i,
        ],
        priority: 5,
    },
    INVENTORY_CHECK: {
        patterns: [
            /\b(kho hàng|tồn kho|inventory|stock|còn hàng|in stock)\b/i,
            /\b(bao nhiêu)\b.*\b(sản phẩm|sp|mặt hàng|items?|products?)\b/i,
            /\b(sản phẩm|sp|mặt hàng)\b.*\b(bao nhiêu|mấy|how many)\b/i,
            /\b(tổng|total|tất cả|all)\b.*\b(sản phẩm|sp|products?|items?)\b/i,
            /\b(danh sách|list)\b.*\b(sản phẩm|hàng|products?)\b/i,
            /\b(có gì|có những gì|what do you have|what.*available)\b/i,
            /\b(còn|available).*\b(bao nhiêu|how many|mấy)\b/i,
        ],
        priority: 8,
    },
    AUTHENTICITY: {
        patterns: [
            /\b(thật|chính hãng|authentic|real|fake|giả|xác thực|verify|legit)\b/i,
            /\b(bảo đảm|guarantee|warranty|cam kết|certificate)\b/i,
        ],
        priority: 7,
    },
};

// =====================================================
// ENTITY EXTRACTION DATA
// =====================================================

const BRAND_ALIASES = {
    'rick owens': ['rick', 'ro', 'rick owen'],
    'comme des garçons': ['cdg', 'comme des garcons', 'commes des garcons', 'comme'],
    'yohji yamamoto': ['yohji', 'yamamoto', 'y-3', 'y3'],
    'issey miyake': ['issey', 'miyake', 'homme plisse'],
    'maison margiela': ['margiela', 'mmm', 'maison martin margiela', 'mm6'],
    'raf simons': ['raf', 'simons'],
    'balenciaga': ['balenciaga', 'bal'],
    'vetements': ['vetements', 'vtm'],
    'off-white': ['off white', 'ow', 'offwhite'],
    'fear of god': ['fog', 'fear of god', 'essentials'],
    'undercover': ['undercover', 'jun takahashi'],
    'visvim': ['visvim', 'vis'],
    'number (n)ine': ['number nine', 'n(n)', 'number(n)ine'],
    'julius': ['julius', 'julius_7'],
    'ann demeulemeester': ['ann d', 'ann demeulemeester'],
    'dries van noten': ['dries', 'dvn'],
    'haider ackermann': ['haider'],
    'the row': ['the row'],
    'lemaire': ['lemaire'],
    'acronym': ['acronym', 'acr'],
};

const CATEGORY_ALIASES = {
    Shoes: ['giày', 'shoes', 'shoe', 'sneaker', 'sneakers', 'boot', 'boots', 'dép', 'sandal', 'platform'],
    Outerwear: ['áo khoác', 'jacket', 'jackets', 'coat', 'coats', 'bomber', 'blazer', 'outerwear', 'khoác', 'gore-tex', 'parka'],
    Pants: ['quần', 'pants', 'trousers', 'jeans', 'shorts', 'cargo', 'wide-leg', 'technical'],
    Tops: ['áo', 'shirt', 'shirts', 'top', 'tops', 'hoodie', 'sweater', 'cardigan', 'tee', 't-shirt', 'polo'],
    Bags: ['túi', 'bag', 'bags', 'tote', 'backpack', 'crossbody', 'clutch', 'handbag'],
    Dresses: ['váy', 'dress', 'dresses', 'đầm', 'skirt'],
    Accessories: ['phụ kiện', 'accessories', 'belt', 'thắt lưng', 'nón', 'hat', 'cap', 'kính', 'glasses', 'jewelry', 'watch'],
};

const COLOR_PATTERNS = {
    Black: [/\b(đen|black)\b/i],
    White: [/\b(trắng|white)\b/i],
    Grey: [/\b(xám|grey|gray)\b/i],
    Blue: [/\b(xanh dương|xanh biển|blue)\b/i, /\bxanh\b(?!\s*(lá|rêu|olive))/i],
    Navy: [/\b(navy|xanh navy|xanh đậm)\b/i],
    Green: [/\b(xanh lá|green)\b/i],
    Olive: [/\b(olive|xanh rêu|rêu)\b/i],
    Red: [/\b(đỏ|red)\b/i],
    Burgundy: [/\b(burgundy|đỏ đô|đỏ rượu)\b/i],
    Cream: [/\b(cream|kem|be)\b/i],
    Brown: [/\b(nâu|brown|tan)\b/i],
    Pink: [/\b(hồng|pink)\b/i],
    Yellow: [/\b(vàng|yellow)\b/i],
    Purple: [/\b(tím|purple|violet)\b/i],
    Orange: [/\b(cam|orange)\b/i],
};

const STYLE_MAP = {
    minimalist: [/\b(minimalist|tối giản|minimal|đơn giản)\b/i],
    streetwear: [/\b(streetwear|street|đường phố)\b/i],
    techwear: [/\b(techwear|tech|technical|công nghệ)\b/i],
    'avant-garde': [/\b(avant[- ]?garde|tiền vệ|phá cách|experimental)\b/i],
    casual: [/\b(casual|đi chơi|thường ngày|hàng ngày|daily)\b/i],
    formal: [/\b(formal|công sở|lịch sự|sang trọng|elegant|dự tiệc)\b/i],
    sporty: [/\b(sporty|thể thao|sport|gym|active)\b/i],
    vintage: [/\b(vintage|retro|cổ điển|classic)\b/i],
};

// =====================================================
// FUNCTIONS
// =====================================================

function classifyIntent(message) {
    const messageLower = message.toLowerCase().trim();
    const scores = {};

    for (const [intentName, intentData] of Object.entries(INTENTS)) {
        let score = 0;
        for (const pattern of intentData.patterns) {
            const matches = messageLower.match(pattern);
            if (matches) {
                score += (matches.length || 1) * (intentData.priority / 10.0);
            }
        }
        if (score > 0) {
            scores[intentName] = score;
        }
    }

    if (Object.keys(scores).length === 0) {
        return ['FALLBACK', 0.0];
    }

    const bestIntent = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const bestScore = scores[bestIntent];
    const confidence = Math.min(bestScore / 3.0, 1.0);

    return [bestIntent, confidence];
}

function extractEntities(message) {
    const messageLower = message.toLowerCase().trim();
    const entities = {};

    // Extract brand
    for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
        const allNames = [brand, ...aliases];
        for (const name of allNames) {
            if (messageLower.includes(name.toLowerCase())) {
                entities.brand = brand.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                break;
            }
        }
        if (entities.brand) break;
    }

    // Extract category
    for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
        for (const alias of aliases) {
            const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`\\b${escaped}\\b`, 'i').test(messageLower)) {
                entities.category = category;
                break;
            }
        }
        if (entities.category) break;
    }

    // Extract price range (VND)
    const priceMatch = messageLower.match(/(\d+[.,]?\d*)\s*(triệu|tr|million|m)\b/);
    if (priceMatch) {
        const value = parseFloat(priceMatch[1].replace(',', '.'));
        entities.price_hint = Math.floor(value * 1_000_000);
    }

    if (!entities.price_hint) {
        const priceKMatch = messageLower.match(/(\d+)\s*(k|nghìn|thousand)\b/);
        if (priceKMatch) {
            entities.price_hint = parseInt(priceKMatch[1]) * 1_000;
        }
    }

    if (!entities.price_hint) {
        const usdMatch = messageLower.match(/\$\s*(\d+)/);
        if (usdMatch) {
            entities.price_hint = parseInt(usdMatch[1]) * 25_000;
        }
    }

    // Extract height (cm)
    const heightMatch = messageLower.match(/(?:cao|height|chiều cao)[:\s]*(\d{2,3})\s*(?:cm|xăng ti|phân)?/);
    if (heightMatch) {
        const h = parseInt(heightMatch[1]);
        if (h >= 100 && h <= 220) entities.height_cm = h;
    }

    if (!entities.height_cm) {
        const heightMMatch = messageLower.match(/(\d)[.,](\d{1,2})\s*m\b/);
        if (heightMMatch) {
            const meters = parseInt(heightMMatch[1]);
            const decimals = heightMMatch[2].padEnd(2, '0');
            const cm = meters * 100 + parseInt(decimals);
            if (cm >= 100 && cm <= 220) entities.height_cm = cm;
        }
    }

    // Extract weight (kg)
    const weightMatch = messageLower.match(/(?:nặng|cân nặng|weight|cân)[:\s]*(\d{2,3})\s*(?:kg|ký|kí)?/);
    if (weightMatch) {
        const w = parseInt(weightMatch[1]);
        if (w >= 30 && w <= 200) entities.weight_kg = w;
    }

    // Extract gender
    if (/\b(nam|male|men|anh|boy|trai)\b/i.test(messageLower)) {
        entities.gender = 'male';
    } else if (/\b(nữ|female|women|chị|girl|gái)\b/i.test(messageLower)) {
        entities.gender = 'female';
    }

    // Extract color
    for (const [color, patterns] of Object.entries(COLOR_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(messageLower)) {
                entities.color = color;
                break;
            }
        }
        if (entities.color) break;
    }

    // Extract style keywords
    const styleKeywords = [];
    for (const [style, patterns] of Object.entries(STYLE_MAP)) {
        for (const pattern of patterns) {
            if (pattern.test(messageLower)) {
                styleKeywords.push(style);
                break;
            }
        }
    }
    if (styleKeywords.length > 0) {
        entities.style = styleKeywords;
    }

    return entities;
}

function extractSearchQuery(message, entities) {
    const parts = [];

    if (entities.brand) parts.push(entities.brand);
    if (entities.category) parts.push(entities.category);

    if (parts.length > 0) return parts.join(' ');

    // Remove filler words
    let messageClean = message.toLowerCase().replace(
        /\b(tìm|tìm kiếm|search|find|show|xem|cho|tôi|mình|em|anh|chị|muốn|mua|có|không|nào|cái|chiếc|đôi|bộ|giúp|với|ạ|nhé|ơi|vậy|the|a|an|me|please|can|you|want|looking for|i|need)\b/gi,
        ''
    ).trim();

    messageClean = messageClean.replace(/\s+/g, ' ').trim();

    if (messageClean.length >= 2) return messageClean;
    return null;
}

module.exports = {
    classifyIntent,
    extractEntities,
    extractSearchQuery,
    BRAND_ALIASES,
    CATEGORY_ALIASES,
};
