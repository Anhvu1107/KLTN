"""
Intent Classifier
AURA ARCHIVE - Phân loại ý định người dùng (VI + EN)
Hỗ trợ extract entities: brand, category, size, price range, style
"""

import re
from typing import Dict, Any, List, Optional, Tuple


# =====================================================
# INTENT DEFINITIONS
# =====================================================

INTENTS = {
    "GREETING": {
        "patterns": [
            r"\b(hello|hi|hey|xin chào|chào|alo|helu|chào bạn|chào shop)\b",
            r"^(hi|hello|hey|chào)[\s!.]*$",
        ],
        "priority": 10,
    },
    "FAREWELL": {
        "patterns": [
            r"\b(bye|goodbye|tạm biệt|cảm ơn|thank|thanks|cám ơn|ok cảm ơn|bye bye)\b",
            r"\b(hẹn gặp lại|see you|have a nice day)\b",
        ],
        "priority": 10,
    },
    "PRODUCT_SEARCH": {
        "patterns": [
            r"\b(tìm|tìm kiếm|search|find|show|xem|có không|có .+ không|kiếm|muốn mua|muốn xem)\b",
            r"\b(recommend|gợi ý|đề xuất|giới thiệu sản phẩm|sp nào|sản phẩm nào)\b",
            r"\b(có gì|hàng mới|new arrival|mới về|hàng về)\b",
        ],
        "priority": 8,
    },
    "BRAND_INFO": {
        "patterns": [
            r"\b(kể về|giới thiệu về|tell me about|about|info|thông tin|brand|thương hiệu)\b",
            r"\b(lịch sử|history|story|câu chuyện)\b.*\b(brand|thương hiệu|hãng)\b",
        ],
        "priority": 7,
    },
    "PRICE_INQUIRY": {
        "patterns": [
            r"\b(giá|bao nhiêu|price|cost|budget|tầm giá|khoảng giá|trong khoảng)\b",
            r"\b(rẻ|đắt|cheap|expensive|affordable|tiết kiệm|sale|giảm giá|khuyến mãi)\b",
            r"\d+\s*(triệu|tr|k|nghìn|million|usd|\$|đồng|vnđ|vnd)",
        ],
        "priority": 8,
    },
    "STYLE_ADVICE": {
        "patterns": [
            r"\b(phối|mix|match|mặc gì|wear|outfit|style|phong cách|trend)\b",
            r"\b(kết hợp|combine|coordination|phối đồ|mix đồ|layer)\b",
            r"\b(đi dự|đi làm|đi chơi|đi học|occasion|sự kiện|party|date|công sở)\b",
            r"\b(đẹp|nên mặc|nên mua|hợp|suitable|recommend)\b",
        ],
        "priority": 7,
    },
    "SIZE_HELP": {
        "patterns": [
            r"\b(size|cỡ|kích thước|fit|vừa|rộng|chật|form)\b",
            r"\b(chiều cao|cao|height|weight|cân nặng|nặng|kg|cm)\b",
            r"\d+\s*(kg|cm|m)\b",
        ],
        "priority": 8,
    },
    "CUSTOMER_PROFILE": {
        "patterns": [
            r"\b(cao|nặng|da|màu da|skin|tone|body|dáng|người|thân hình)\b",
            r"\b(thích|like|prefer|yêu thích|gu|taste)\b.*\b(style|phong cách|kiểu|thời trang)\b",
            r"\b(tuổi|age|năm sinh|gender|giới tính|nam|nữ|male|female)\b",
        ],
        "priority": 6,
    },
    "CONSIGNMENT": {
        "patterns": [
            r"\b(ký gửi|consign|consignment|bán|sell|bán đồ|gửi bán)\b",
            r"\b(muốn bán|want to sell|listing|đăng bán)\b",
        ],
        "priority": 7,
    },
    "ORDER_STATUS": {
        "patterns": [
            r"\b(đơn hàng|order|tracking|theo dõi|giao hàng|shipping|vận chuyển)\b",
            r"\b(trạng thái|status|khi nào|when|delivery|nhận hàng)\b",
            r"\b(đổi trả|return|refund|hoàn tiền|bảo hành)\b",
        ],
        "priority": 7,
    },
    "CATEGORY_BROWSE": {
        "patterns": [
            r"\b(shoes|giày|sneaker|boot|dép|sandal)\b",
            r"\b(áo|shirt|top|hoodie|sweater|jacket|bomber|coat|khoác|blazer|outerwear)\b",
            r"\b(quần|pants|trousers|jeans|shorts|cargo)\b",
            r"\b(túi|bag|bags|tote|backpack|crossbody|clutch)\b",
            r"\b(váy|dress|dresses|đầm|skirt)\b",
            r"\b(phụ kiện|accessories|belt|nón|hat|cap|thắt lưng|kính|glasses|jewelry)\b",
        ],
        "priority": 5,
    },
    "INVENTORY_CHECK": {
        "patterns": [
            r"\b(kho hàng|tồn kho|inventory|stock|còn hàng|in stock)\b",
            r"\b(bao nhiêu)\b.*\b(sản phẩm|sp|mặt hàng|items?|products?)\b",
            r"\b(sản phẩm|sp|mặt hàng)\b.*\b(bao nhiêu|mấy|how many)\b",
            r"\b(tổng|total|tất cả|all)\b.*\b(sản phẩm|sp|products?|items?)\b",
            r"\b(danh sách|list)\b.*\b(sản phẩm|hàng|products?)\b",
            r"\b(có gì|có những gì|what do you have|what.*available)\b",
            r"\b(còn|available).*\b(bao nhiêu|how many|mấy)\b",
        ],
        "priority": 8,
    },
    "AUTHENTICITY": {
        "patterns": [
            r"\b(thật|chính hãng|authentic|real|fake|giả|xác thực|verify|legit)\b",
            r"\b(bảo đảm|guarantee|warranty|cam kết|certificate)\b",
        ],
        "priority": 7,
    },
}

# =====================================================
# ENTITY EXTRACTION
# =====================================================

BRAND_ALIASES = {
    "rick owens": ["rick", "ro", "rick owen"],
    "comme des garçons": ["cdg", "comme des garcons", "commes des garcons", "comme"],
    "yohji yamamoto": ["yohji", "yamamoto", "y-3", "y3"],
    "issey miyake": ["issey", "miyake", "homme plisse"],
    "maison margiela": ["margiela", "mmm", "maison martin margiela", "mm6"],
    "raf simons": ["raf", "simons"],
    "balenciaga": ["balenciaga", "bal"],
    "vetements": ["vetements", "vtm"],
    "off-white": ["off white", "ow", "offwhite"],
    "fear of god": ["fog", "fear of god", "essentials"],
    "undercover": ["undercover", "jun takahashi"],
    "visvim": ["visvim", "vis"],
    "number (n)ine": ["number nine", "n(n)", "number(n)ine"],
    "julius": ["julius", "julius_7"],
    "ann demeulemeester": ["ann d", "ann demeulemeester"],
    "dries van noten": ["dries", "dvn"],
    "haider ackermann": ["haider"],
    "the row": ["the row"],
    "lemaire": ["lemaire"],
    "acronym": ["acronym", "acr"],
}

CATEGORY_ALIASES = {
    "Shoes": ["giày", "shoes", "shoe", "sneaker", "sneakers", "boot", "boots", "dép", "sandal", "platform"],
    "Outerwear": ["áo khoác", "jacket", "jackets", "coat", "coats", "bomber", "blazer", "outerwear", "khoác", "gore-tex", "parka"],
    "Pants": ["quần", "pants", "trousers", "jeans", "shorts", "cargo", "wide-leg", "technical"],
    "Tops": ["áo", "shirt", "shirts", "top", "tops", "hoodie", "sweater", "cardigan", "tee", "t-shirt", "polo"],
    "Bags": ["túi", "bag", "bags", "tote", "backpack", "crossbody", "clutch", "handbag"],
    "Dresses": ["váy", "dress", "dresses", "đầm", "skirt"],
    "Accessories": ["phụ kiện", "accessories", "belt", "thắt lưng", "nón", "hat", "cap", "kính", "glasses", "jewelry", "watch"],
}

SIZE_PATTERNS = {
    "XS": [r"\bxs\b", r"\bextra small\b"],
    "S": [r"\bs\b(?!ize)", r"\bsmall\b", r"\bnhỏ\b"],
    "M": [r"\bm\b(?!aterial)", r"\bmedium\b", r"\bvừa\b", r"\btrung bình\b"],
    "L": [r"\bl\b(?!arge)", r"\blarge\b", r"\blớn\b"],
    "XL": [r"\bxl\b", r"\bextra large\b"],
}


def classify_intent(message: str) -> Tuple[str, float]:
    """
    Classify user message into an intent.
    Returns (intent_name, confidence_score)
    """
    message_lower = message.lower().strip()
    
    scores: Dict[str, float] = {}
    
    for intent_name, intent_data in INTENTS.items():
        score = 0.0
        patterns = intent_data["patterns"]
        priority = intent_data["priority"]
        
        for pattern in patterns:
            matches = re.findall(pattern, message_lower, re.IGNORECASE)
            if matches:
                # Score based on number of matches and priority
                score += len(matches) * (priority / 10.0)
        
        if score > 0:
            scores[intent_name] = score
    
    if not scores:
        return ("FALLBACK", 0.0)
    
    # Return highest scoring intent
    best_intent = max(scores, key=scores.get)
    best_score = scores[best_intent]
    
    # Normalize confidence to 0-1
    confidence = min(best_score / 3.0, 1.0)
    
    return (best_intent, confidence)


def extract_entities(message: str) -> Dict[str, Any]:
    """
    Extract entities from user message:
    - brand, category, size, price_range, color, style keywords
    - customer info: height, weight, skin_tone, gender
    """
    message_lower = message.lower().strip()
    entities: Dict[str, Any] = {}
    
    # ---- Extract brand ----
    for brand, aliases in BRAND_ALIASES.items():
        all_names = [brand] + aliases
        for name in all_names:
            if name.lower() in message_lower:
                entities["brand"] = brand.title()
                break
        if "brand" in entities:
            break
    
    # ---- Extract category ----
    for category, aliases in CATEGORY_ALIASES.items():
        for alias in aliases:
            if re.search(rf"\b{re.escape(alias)}\b", message_lower, re.IGNORECASE):
                entities["category"] = category
                break
        if "category" in entities:
            break
    
    # ---- Extract size ----
    for size, patterns in SIZE_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, message_lower, re.IGNORECASE):
                entities["size"] = size
                break
        if "size" in entities:
            break
    
    # ---- Extract price range (VND) ----
    price_match = re.search(
        r"(\d+[\.,]?\d*)\s*(triệu|tr|million|m)\b",
        message_lower,
    )
    if price_match:
        value = float(price_match.group(1).replace(",", "."))
        entities["price_hint"] = int(value * 1_000_000)  # Convert to VND
    
    price_k_match = re.search(
        r"(\d+)\s*(k|nghìn|thousand)\b",
        message_lower,
    )
    if price_k_match and "price_hint" not in entities:
        value = int(price_k_match.group(1))
        entities["price_hint"] = value * 1_000  # Convert to VND
    
    # USD match
    usd_match = re.search(r"\$\s*(\d+)", message_lower)
    if usd_match and "price_hint" not in entities:
        entities["price_hint"] = int(usd_match.group(1)) * 25_000
    
    # ---- Extract height (cm) ----
    height_match = re.search(
        r"(?:cao|height|chiều cao)[:\s]*(\d{2,3})\s*(?:cm|xăng ti|phân)?",
        message_lower,
    )
    if height_match:
        h = int(height_match.group(1))
        if 100 <= h <= 220:
            entities["height_cm"] = h
    
    # Also match "1m65", "1.7m" pattern
    height_m_match = re.search(r"(\d)[.,](\d{1,2})\s*m\b", message_lower)
    if height_m_match and "height_cm" not in entities:
        meters = int(height_m_match.group(1))
        decimals = height_m_match.group(2)
        cm = meters * 100 + int(decimals.ljust(2, '0'))
        if 100 <= cm <= 220:
            entities["height_cm"] = cm
    
    # ---- Extract weight (kg) ----
    weight_match = re.search(
        r"(?:nặng|cân nặng|weight|cân)[:\s]*(\d{2,3})\s*(?:kg|ký|kí)?",
        message_lower,
    )
    if weight_match:
        w = int(weight_match.group(1))
        if 30 <= w <= 200:
            entities["weight_kg"] = w
    
    # ---- Extract gender ----
    if re.search(r"\b(nam|male|men|anh|boy|trai)\b", message_lower):
        entities["gender"] = "male"
    elif re.search(r"\b(nữ|female|women|chị|girl|gái)\b", message_lower):
        entities["gender"] = "female"
    
    # ---- Extract color preference ----
    color_patterns = {
        "Black": [r"\b(đen|black)\b"],
        "White": [r"\b(trắng|white)\b"],
        "Grey": [r"\b(xám|grey|gray)\b"],
        "Blue": [r"\b(xanh dương|xanh biển|blue)\b", r"\bxanh\b(?!\s*(lá|rêu|olive))"],
        "Navy": [r"\b(navy|xanh navy|xanh đậm)\b"],
        "Green": [r"\b(xanh lá|green)\b"],
        "Olive": [r"\b(olive|xanh rêu|rêu)\b"],
        "Red": [r"\b(đỏ|red)\b"],
        "Burgundy": [r"\b(burgundy|đỏ đô|đỏ rượu)\b"],
        "Cream": [r"\b(cream|kem|be)\b"],
        "Brown": [r"\b(nâu|brown|tan)\b"],
        "Pink": [r"\b(hồng|pink)\b"],
        "Yellow": [r"\b(vàng|yellow)\b"],
        "Purple": [r"\b(tím|purple|violet)\b"],
        "Orange": [r"\b(cam|orange)\b"],
    }
    for color, patterns in color_patterns.items():
        for pattern in patterns:
            if re.search(pattern, message_lower, re.IGNORECASE):
                entities["color"] = color
                break
        if "color" in entities:
            break
    
    # ---- Extract style keywords ----
    style_keywords = []
    style_map = {
        "minimalist": [r"\b(minimalist|tối giản|minimal|đơn giản)\b"],
        "streetwear": [r"\b(streetwear|street|đường phố)\b"],
        "techwear": [r"\b(techwear|tech|technical|công nghệ)\b"],
        "avant-garde": [r"\b(avant[- ]?garde|tiền vệ|phá cách|experimental)\b"],
        "casual": [r"\b(casual|đi chơi|thường ngày|hàng ngày|daily)\b"],
        "formal": [r"\b(formal|công sở|lịch sự|sang trọng|elegant|dự tiệc)\b"],
        "sporty": [r"\b(sporty|thể thao|sport|gym|active)\b"],
        "vintage": [r"\b(vintage|retro|cổ điển|classic)\b"],
    }
    for style, patterns in style_map.items():
        for pattern in patterns:
            if re.search(pattern, message_lower, re.IGNORECASE):
                style_keywords.append(style)
                break
    if style_keywords:
        entities["style"] = style_keywords
    
    return entities


def extract_search_query(message: str, entities: Dict[str, Any]) -> Optional[str]:
    """
    Build a search query string for product API from the message and entities.
    """
    parts = []
    
    if "brand" in entities:
        parts.append(entities["brand"])
    if "category" in entities:
        parts.append(entities["category"])
    # NOTE: color is NOT added to search query text because
    # the product DB stores colors in Vietnamese ("Đen", "Trắng")
    # while entities are in English ("Black", "White").
    # Color filtering is handled by post-filter in product_search.py.
    
    # If we have explicit search parts, use them
    if parts:
        return " ".join(parts)
    
    # Otherwise try to extract the search term from the message
    # Remove common filler words
    message_clean = re.sub(
        r"\b(tìm|tìm kiếm|search|find|show|xem|cho|tôi|mình|em|anh|chị|"
        r"muốn|mua|có|không|nào|cái|chiếc|đôi|bộ|giúp|với|ạ|nhé|ơi|vậy|"
        r"the|a|an|me|please|can|you|want|looking for|i|need)\b",
        "",
        message.lower(),
        flags=re.IGNORECASE,
    ).strip()
    
    # Remove excess whitespace
    message_clean = re.sub(r"\s+", " ", message_clean).strip()
    
    if len(message_clean) >= 2:
        return message_clean
    
    return None
