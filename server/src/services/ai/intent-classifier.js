/**
 * Intent classifier for AURA AI.
 * Uses normalized text matching so Vietnamese messages with accents
 * like "ao", "áo", "gioi thieu", "giới thiệu" behave the same.
 */

const INTENTS = {
    GREETING: {
        phrases: ['hello', 'hi', 'hey', 'xin chao', 'chao', 'alo', 'helu', 'chao ban', 'chao shop'],
        priority: 10,
    },
    FAREWELL: {
        phrases: ['bye', 'goodbye', 'tam biet', 'cam on', 'thanks', 'thank', 'hen gap lai', 'see you'],
        priority: 10,
    },
    PRODUCT_SEARCH: {
        phrases: [
            'tim',
            'tim kiem',
            'search',
            'find',
            'show',
            'xem',
            'co khong',
            'kiem',
            'muon mua',
            'muon xem',
            'recommend',
            'goi y',
            'de xuat',
            'gioi thieu',
            'sp nao',
            'san pham nao',
            'co gi',
            'hang moi',
            'new arrival',
            'moi ve',
            'hang ve',
            'dua dai',
            'dua 1 cai',
            'dua mot cai',
            'chon dum',
            'chon giup',
            'co mau nao',
            'mau nao',
            'suggest',
        ],
        priority: 8,
    },
    BRAND_INFO: {
        phrases: ['ke ve', 'gioi thieu ve', 'tell me about', 'about', 'info', 'thong tin', 'brand', 'thuong hieu', 'lich su', 'history', 'story', 'cau chuyen'],
        priority: 7,
    },
    PRICE_INQUIRY: {
        phrases: ['gia', 'bao nhieu', 'price', 'cost', 'budget', 'tam gia', 'khoang gia', 'trong khoang', 're', 'dat', 'cheap', 'expensive', 'affordable', 'sale'],
        priority: 8,
    },
    STYLE_ADVICE: {
        phrases: ['phoi', 'mix', 'match', 'mac gi', 'wear', 'outfit', 'style', 'phong cach', 'trend', 'ket hop', 'combine', 'coordination', 'phoi do', 'mix do', 'layer', 'di du', 'di lam', 'di choi', 'occasion', 'su kien', 'party', 'date', 'cong so', 'dep', 'nen mac', 'nen mua', 'hop', 'suitable'],
        priority: 7,
    },
    SIZE_HELP: {
        phrases: ['size', 'co', 'kich thuoc', 'fit', 'vua', 'rong', 'chat', 'form', 'chieu cao', 'cao', 'height', 'weight', 'can nang', 'nang', 'kg', 'cm'],
        priority: 8,
    },
    CUSTOMER_PROFILE: {
        phrases: ['cao', 'nang', 'da', 'mau da', 'skin', 'tone', 'body', 'dang', 'nguoi', 'than hinh', 'thich', 'like', 'prefer', 'yeu thich', 'gu', 'taste', 'tuoi', 'age', 'nam sinh', 'gender', 'gioi tinh', 'nam', 'nu', 'male', 'female'],
        priority: 6,
    },
    CONSIGNMENT: {
        phrases: ['ky gui', 'consign', 'consignment', 'ban', 'sell', 'ban do', 'gui ban', 'muon ban', 'want to sell', 'listing', 'dang ban'],
        priority: 7,
    },
    ORDER_STATUS: {
        phrases: ['don hang', 'order', 'tracking', 'theo doi', 'giao hang', 'shipping', 'van chuyen', 'trang thai', 'status', 'khi nao', 'when', 'delivery', 'nhan hang', 'doi tra', 'return', 'refund', 'hoan tien', 'bao hanh'],
        priority: 7,
    },
    INVENTORY_CHECK: {
        phrases: ['kho hang', 'ton kho', 'inventory', 'stock', 'con hang', 'in stock', 'bao nhieu san pham', 'tong san pham', 'tat ca san pham', 'danh sach san pham', 'what do you have', 'available'],
        priority: 8,
    },
    COUPON_INQUIRY: {
        phrases: ['coupon', 'ma giam gia', 'giam gia', 'voucher', 'discount', 'khuyen mai', 'promo', 'promotion', 'code', 'ma uu dai', 'uu dai', 'ma khuyen mai'],
        priority: 9,
    },
    AUTHENTICITY: {
        phrases: ['that', 'chinh hang', 'authentic', 'real', 'fake', 'gia', 'xac thuc', 'verify', 'legit', 'bao dam', 'guarantee', 'warranty', 'cam ket', 'certificate'],
        priority: 7,
    },
};

const BRAND_ALIASES = {
    'Rick Owens': ['rick', 'ro', 'rick owen'],
    'Comme des Garçons': ['cdg', 'comme des garcons', 'commes des garcons', 'comme'],
    'Yohji Yamamoto': ['yohji', 'yamamoto', 'y-3', 'y3'],
    'Issey Miyake': ['issey', 'miyake', 'homme plisse'],
    'Maison Margiela': ['margiela', 'mmm', 'maison martin margiela', 'mm6'],
    'Raf Simons': ['raf', 'simons'],
    Balenciaga: ['balenciaga', 'bal'],
    Vetements: ['vetements', 'vtm'],
    'Off-White': ['off white', 'ow', 'offwhite'],
    'Fear of God': ['fog', 'fear of god', 'essentials'],
    Undercover: ['undercover', 'jun takahashi'],
    Visvim: ['visvim', 'vis'],
    'Number (N)ine': ['number nine', 'n(n)', 'number(n)ine'],
    Julius: ['julius', 'julius_7'],
    'Ann Demeulemeester': ['ann d', 'ann demeulemeester'],
    'Dries van Noten': ['dries', 'dvn'],
    'Haider Ackermann': ['haider'],
    'The Row': ['the row'],
    Lemaire: ['lemaire'],
    Acronym: ['acronym', 'acr'],
};

const CATEGORY_ALIASES = {
    Shoes: ['giay', 'shoes', 'shoe', 'sneaker', 'sneakers', 'boot', 'boots', 'dep', 'sandal', 'platform'],
    Outerwear: ['ao khoac', 'jacket', 'jackets', 'coat', 'coats', 'bomber', 'blazer', 'outerwear', 'khoac', 'gore-tex', 'parka'],
    Pants: ['quan', 'pants', 'trousers', 'jeans', 'shorts', 'cargo', 'wide-leg', 'technical'],
    Tops: ['ao', 'shirt', 'shirts', 'top', 'tops', 'hoodie', 'sweater', 'cardigan', 'tee', 't-shirt', 'polo', 'so mi'],
    Bags: ['tui', 'bag', 'bags', 'tote', 'backpack', 'crossbody', 'clutch', 'handbag'],
    Dresses: ['vay', 'dress', 'dresses', 'dam', 'skirt'],
    Accessories: ['phu kien', 'accessories', 'belt', 'that lung', 'non', 'hat', 'cap', 'kinh', 'glasses', 'jewelry', 'watch'],
};

const COLOR_ALIASES = {
    Black: ['den', 'black'],
    White: ['trang', 'white'],
    Grey: ['xam', 'grey', 'gray'],
    Blue: ['xanh duong', 'xanh bien', 'blue'],
    Navy: ['navy', 'xanh navy', 'xanh dam'],
    Green: ['xanh la', 'green'],
    Olive: ['olive', 'xanh reu', 'reu'],
    Red: ['do', 'red'],
    Burgundy: ['burgundy', 'do do', 'do ruou'],
    Cream: ['cream', 'kem', 'be'],
    Brown: ['nau', 'brown', 'tan'],
    Pink: ['hong', 'pink'],
    Yellow: ['vang', 'yellow'],
    Purple: ['tim', 'purple', 'violet'],
    Orange: ['cam', 'orange'],
};

const STYLE_MAP = {
    minimalist: ['minimalist', 'toi gian', 'minimal', 'don gian'],
    streetwear: ['streetwear', 'street', 'duong pho'],
    techwear: ['techwear', 'tech', 'technical', 'cong nghe'],
    'avant-garde': ['avant garde', 'avant-garde', 'tien ve', 'pha cach', 'experimental'],
    casual: ['casual', 'di choi', 'thuong ngay', 'hang ngay', 'daily'],
    formal: ['formal', 'cong so', 'lich su', 'sang trong', 'elegant', 'du tiec'],
    sporty: ['sporty', 'the thao', 'sport', 'gym', 'active'],
    vintage: ['vintage', 'retro', 'co dien', 'classic'],
};

const GENERIC_PRODUCT_SEARCH_PHRASES = [
    'gioi thieu',
    'goi y',
    'de xuat',
    'dua dai',
    'dua 1 cai',
    'dua mot cai',
    'chon dum',
    'chon giup',
    'co mau nao',
    'mau nao',
    'show me',
    'recommend',
    'suggest',
];

const SHOPPING_INTENT_PHRASES = [
    'muon mua',
    'mua',
    'muon xem',
    'tim',
    'tim kiem',
    'kiem',
];

const SEARCH_FILLER_PHRASES = [
    'tim',
    'tim kiem',
    'search',
    'find',
    'show',
    'xem',
    'cho',
    'toi',
    'minh',
    'em',
    'anh',
    'chi',
    'muon',
    'mua',
    'co',
    'khong',
    'nao',
    'cai',
    'chiec',
    'doi',
    'bo',
    'giup',
    'voi',
    'a',
    'nhe',
    'oi',
    'vay',
    'the',
    'an',
    'me',
    'please',
    'can',
    'you',
    'want',
    'looking for',
    'need',
    'gioi thieu',
    'goi y',
    'de xuat',
    'dua dai',
    'dua 1 cai',
    'dua mot cai',
];

function normalizeForMatching(value = '') {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

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

function containsAnyPhrase(text, phrases = []) {
    return phrases.some((phrase) => containsWholePhrase(text, phrase));
}

function removeWholePhrase(text, phrase) {
    const normalizedPhrase = normalizeForMatching(phrase);
    if (!text || !normalizedPhrase) return text;

    return text
        .replace(new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedPhrase)}(?=$|[^a-z0-9])`, 'gi'), ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function findMatchingBrand(text) {
    for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
        for (const alias of [brand, ...aliases]) {
            if (containsWholePhrase(text, alias)) {
                return brand;
            }
        }
    }

    return null;
}

function findMatchingCategory(text) {
    for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
        for (const alias of aliases) {
            if (containsWholePhrase(text, alias)) {
                return category;
            }
        }
    }

    return null;
}

function findMatchingColor(text) {
    for (const [color, aliases] of Object.entries(COLOR_ALIASES)) {
        for (const alias of aliases) {
            if (containsWholePhrase(text, alias)) {
                return color;
            }
        }
    }

    return null;
}

function getBrandVariants(displayBrand) {
    if (!displayBrand) return [];
    return [displayBrand, ...(BRAND_ALIASES[displayBrand] || [])];
}

function classifyIntent(message) {
    const normalizedMessage = normalizeForMatching(message);
    const scores = {};

    for (const [intentName, intentData] of Object.entries(INTENTS)) {
        let score = 0;

        for (const phrase of intentData.phrases) {
            if (containsWholePhrase(normalizedMessage, phrase)) {
                score += intentData.priority / 10.0;
            }
        }

        if (intentName === 'PRICE_INQUIRY' && /(\d+[.,]?\d*)\s*(trieu|tr|k|nghin|million|usd|dong|vnd)\b/i.test(normalizedMessage)) {
            score += intentData.priority / 10.0;
        }

        if (intentName === 'SIZE_HELP' && /\b\d+\s*(kg|cm|m)\b/i.test(normalizedMessage)) {
            score += intentData.priority / 10.0;
        }

        if (score > 0) {
            scores[intentName] = score;
        }
    }

    const matchedCategory = findMatchingCategory(normalizedMessage);
    const matchedBrand = findMatchingBrand(normalizedMessage);

    if (matchedCategory) {
        scores.CATEGORY_BROWSE = (scores.CATEGORY_BROWSE || 0) + 0.8;
    }

    if (containsAnyPhrase(normalizedMessage, GENERIC_PRODUCT_SEARCH_PHRASES)) {
        scores.PRODUCT_SEARCH = (scores.PRODUCT_SEARCH || 0) + 0.9;
    }

    if ((matchedCategory || matchedBrand) && containsAnyPhrase(normalizedMessage, SHOPPING_INTENT_PHRASES)) {
        scores.PRODUCT_SEARCH = (scores.PRODUCT_SEARCH || 0) + 0.8;
    }

    if (Object.keys(scores).length === 0) {
        return ['FALLBACK', 0.0];
    }

    const [bestIntent, bestScore] = Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b));
    const confidence = Math.min(bestScore / 3.0, 1.0);

    return [bestIntent, confidence];
}

function extractEntities(message) {
    const normalizedMessage = normalizeForMatching(message);
    const entities = {};

    const brand = findMatchingBrand(normalizedMessage);
    if (brand) entities.brand = brand;

    const category = findMatchingCategory(normalizedMessage);
    if (category) entities.category = category;

    const priceMatch = normalizedMessage.match(/(\d+[.,]?\d*)\s*(trieu|tr|million|m)\b/);
    if (priceMatch) {
        const value = parseFloat(priceMatch[1].replace(',', '.'));
        entities.price_hint = Math.floor(value * 1_000_000);
    }

    if (!entities.price_hint) {
        const priceKMatch = normalizedMessage.match(/(\d+)\s*(k|nghin|thousand)\b/);
        if (priceKMatch) {
            entities.price_hint = parseInt(priceKMatch[1], 10) * 1_000;
        }
    }

    if (!entities.price_hint) {
        const usdMatch = normalizedMessage.match(/\$\s*(\d+)/);
        if (usdMatch) {
            entities.price_hint = parseInt(usdMatch[1], 10) * 25_000;
        }
    }

    const heightMatch = normalizedMessage.match(/(?:cao|height|chieu cao)[:\s]*(\d{2,3})\s*(?:cm|xang ti|phan)?/);
    if (heightMatch) {
        const height = parseInt(heightMatch[1], 10);
        if (height >= 100 && height <= 220) entities.height_cm = height;
    }

    if (!entities.height_cm) {
        const heightMMatch = normalizedMessage.match(/(\d)[.,](\d{1,2})\s*m\b/);
        if (heightMMatch) {
            const meters = parseInt(heightMMatch[1], 10);
            const decimals = heightMMatch[2].padEnd(2, '0');
            const cm = meters * 100 + parseInt(decimals, 10);
            if (cm >= 100 && cm <= 220) entities.height_cm = cm;
        }
    }

    const weightMatch = normalizedMessage.match(/(?:nang|can nang|weight|can)[:\s]*(\d{2,3})\s*(?:kg|ky|ki)?/);
    if (weightMatch) {
        const weight = parseInt(weightMatch[1], 10);
        if (weight >= 30 && weight <= 200) entities.weight_kg = weight;
    }

    if (containsAnyPhrase(normalizedMessage, ['nam', 'male', 'men', 'boy', 'trai'])) {
        entities.gender = 'male';
    } else if (containsAnyPhrase(normalizedMessage, ['nu', 'female', 'women', 'girl', 'gai'])) {
        entities.gender = 'female';
    }

    const color = findMatchingColor(normalizedMessage);
    if (color) entities.color = color;

    const styleKeywords = [];
    for (const [style, aliases] of Object.entries(STYLE_MAP)) {
        if (containsAnyPhrase(normalizedMessage, aliases)) {
            styleKeywords.push(style);
        }
    }
    if (styleKeywords.length > 0) {
        entities.style = styleKeywords;
    }

    return entities;
}

function extractSearchQuery(message, entities = {}) {
    let messageClean = normalizeForMatching(message);

    for (const filler of SEARCH_FILLER_PHRASES) {
        messageClean = removeWholePhrase(messageClean, filler);
    }

    if (entities.brand) {
        for (const variant of getBrandVariants(entities.brand)) {
            messageClean = removeWholePhrase(messageClean, variant);
        }
    }

    if (entities.category) {
        messageClean = removeWholePhrase(messageClean, entities.category);
        for (const alias of (CATEGORY_ALIASES[entities.category] || [])) {
            messageClean = removeWholePhrase(messageClean, alias);
        }
    }

    messageClean = messageClean.replace(/\s+/g, ' ').trim();

    if (messageClean.length >= 2) {
        return messageClean;
    }

    return null;
}

module.exports = {
    classifyIntent,
    extractEntities,
    extractSearchQuery,
    normalizeForMatching,
    BRAND_ALIASES,
    CATEGORY_ALIASES,
};
