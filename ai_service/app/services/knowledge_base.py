"""
Knowledge Base
AURA ARCHIVE - Curated fashion knowledge for the AI Stylist
Contains: brand info, style advice, store policies, size guides
"""

from typing import Dict, Any, List, Optional


# =====================================================
# BRAND DATABASE
# =====================================================

BRANDS: Dict[str, Dict[str, Any]] = {
    "Rick Owens": {
        "origin": "Mỹ (American, based in Paris)",
        "founded": 2001,
        "style": "Dark avant-garde, goth-inspired, architectural silhouettes",
        "signature": "Geobasket sneakers, draped garments, monochrome palette",
        "price_range": "15-80 triệu VND",
        "known_for": "Phom dáng dropcrotch, leather jackets, platform boots, tailoring phá cách",
        "fits": "Oversized, drape heavy, low-crotch. Nên lấy true-to-size hoặc size up 1",
        "best_for": "Người thích phong cách dark, avant-garde, minimalist tối giản",
        "description": "Rick Owens là biểu tượng của thời trang tiên phong. Được biết đến với những thiết kế mang tính kiến trúc, sử dụng chất liệu da, len và cotton cao cấp. Mỗi món đồ đều là một tuyên ngôn thời trang.",
    },
    "Acronym": {
        "origin": "Đức (Germany)",
        "founded": 1994,
        "style": "Techwear, functional fashion, urban utility",
        "signature": "GORE-TEX jackets, modular design, military-inspired",
        "price_range": "20-60 triệu VND",
        "known_for": "Áo khoác chống nước GORE-TEX, thiết kế module, túi chức năng",
        "fits": "Technical fit, slim nhưng thoải mái di chuyển. True-to-size",
        "best_for": "Người yêu thích techwear, urban style, cần trang phục chức năng",
        "description": "Acronym tiên phong trong techwear — kết hợp công nghệ vải hiện đại với thiết kế đô thị. Mỗi sản phẩm đều có tính chức năng cao với chất liệu GORE-TEX, 3L.",
    },
    "Comme des Garçons": {
        "origin": "Nhật Bản (Japan)",
        "founded": 1969,
        "style": "Deconstructed, anti-fashion, punk-inspired",
        "signature": "Heart logo (PLAY line), asymmetric cuts, patchwork",
        "price_range": "5-50 triệu VND",
        "known_for": "Thiết kế giải cấu trúc, bất đối xứng, thách thức chuẩn mực thời trang",
        "fits": "Varies by line. PLAY line true-to-size, mainline thường oversized",
        "best_for": "Người yêu thích thời trang conceptual, avant-garde, muốn khác biệt",
        "description": "Rei Kawakubo sáng lập CDG với triết lý 'anti-fashion'. Thương hiệu có nhiều dòng: PLAY (casual), HOMME PLUS (menswear), SHIRT (basics cao cấp).",
    },
    "Yohji Yamamoto": {
        "origin": "Nhật Bản (Japan)",
        "founded": 1972,
        "style": "Dark, oversized, poetic fashion",
        "signature": "All-black looks, draping, gender-fluid designs",
        "price_range": "15-70 triệu VND",
        "known_for": "Sắc đen tuyệt đối, phom oversized, vải tự nhiên, thơ mộng",
        "fits": "Oversized và drape. Nên lấy đúng size, phom đã rộng sẵn",
        "best_for": "Người mê phong cách tối giản nhưng sâu lắng, all-black aesthetic",
        "description": "Yohji Yamamoto là bậc thầy của sắc đen trong thời trang. Những thiết kế oversized, phom drape tự nhiên, chất liệu cao cấp. Một lựa chọn hoàn hảo cho 'intellectual fashion'.",
    },
    "Issey Miyake": {
        "origin": "Nhật Bản (Japan)",
        "founded": 1970,
        "style": "Innovative textiles, pleating technology, futuristic",
        "signature": "HOMME PLISSÉ line, Bao Bao bags, pleated fabrics",
        "price_range": "8-40 triệu VND",
        "known_for": "Công nghệ xếp ly (pleating), vải nhẹ thoáng, form dáng bay bổng",
        "fits": "HOMME PLISSÉ co giãn tốt. Lấy đúng size, vải stretch thoải mái",
        "best_for": "Người thích thời trang innovative, thoải mái, modern",
        "description": "Issey Miyake nổi tiếng với công nghệ xếp ly HOMME PLISSÉ — nhẹ, thoáng, ít nhăn, dễ mặc hàng ngày nhưng vẫn rất 'fashion'. Dòng Bao Bao bags cũng cực kỳ iconic.",
    },
    "Maison Margiela": {
        "origin": "Pháp (France, Belgian designer)",
        "founded": 1988,
        "style": "Deconstructed, conceptual, avant-garde luxury",
        "signature": "Tabi boots/shoes, numbered lines (0-23), white lab coat",
        "price_range": "10-60 triệu VND",
        "known_for": "Giày Tabi (ngón chân chia đôi), thiết kế giải cấu trúc, artisanal",
        "fits": "Varies. Giày Tabi nên lấy cùng size hoặc size up 0.5",
        "best_for": "Người yêu thích thời trang nghệ thuật, conceptual, muốn statement piece",
        "description": "Martin Margiela cách mạng hóa thời trang với triết lý giải cấu trúc. Thương hiệu được tổ chức theo số (Line 1-23), mỗi số đại diện một category. Giày Tabi là biểu tượng không lẫn vào đâu.",
    },
    "Raf Simons": {
        "origin": "Bỉ (Belgium)",
        "founded": 1995,
        "style": "Youth culture, minimalist, punk-influenced",
        "signature": "Oversized silhouettes, graphic prints, music references",
        "price_range": "12-45 triệu VND",
        "known_for": "Archive pieces cực giá trị, ảnh hưởng từ punk/new wave, tailoring sắc sảo",
        "fits": "Thường oversized intentionally. Lấy đúng size cho oversized fit",
        "best_for": "Người thích thời trang văn hóa trẻ, streetwear luxury, archive collector",
        "description": "Raf Simons kết hợp high fashion với văn hóa đường phố và âm nhạc. Các collection vintage (archive) của Raf có giá trị sưu tầm rất cao.",
    },
    "Balenciaga": {
        "origin": "Tây Ban Nha (Spain, now Paris)",
        "founded": 1917,
        "style": "Oversized streetwear luxury, deconstructed",
        "signature": "Triple S sneakers, oversized hoodies, logo pieces",
        "price_range": "12-50 triệu VND",
        "known_for": "Giày Triple S/Track, oversized silhouettes, Demna Gvasalia era",
        "fits": "Oversized fit. Nhiều items nên size down 1",
        "best_for": "Người thích luxury streetwear, bold statement, oversized aesthetic",
        "description": "Balenciaga dưới thời Demna mang đến aesthetic oversized, deconstructed. Triple S sneakers tạo trend 'chunky sneaker'. Thương hiệu luôn gây tranh cãi và tạo xu hướng.",
    },
    "Fear of God": {
        "origin": "Mỹ (USA)",
        "founded": 2013,
        "style": "Elevated streetwear, faith-inspired, relaxed luxury",
        "signature": "Essentials line, oversized hoodies, relaxed silhouettes",
        "price_range": "5-35 triệu VND",
        "known_for": "Essentials line giá tốt, phom rộng thoải mái, neutral tones",
        "fits": "Oversized relaxed fit. True-to-size cho oversized look",
        "best_for": "Người thích streetwear thoải mái, earth tone, everyday luxury",
        "description": "Jerry Lorenzo tạo ra Fear of God với tinh thần kết hợp street culture và luxury. Dòng Essentials là entry point tuyệt vời với giá accessible hơn mainline.",
    },
    "Undercover": {
        "origin": "Nhật Bản (Japan)",
        "founded": 1990,
        "style": "Punk, experimental, dark romanticism",
        "signature": "Graphic tees, punk references, artistic prints",
        "price_range": "8-40 triệu VND",
        "known_for": "Thiết kế punk-inspired, đồ họa nghệ thuật, collab với Nike/Supreme",
        "fits": "Japanese sizing — thường nhỏ hơn EU/US. Nên size up 1",
        "best_for": "Người mê thời trang punk, graphic art, Japanese fashion culture",
        "description": "Jun Takahashi's Undercover mang đậm tinh thần punk và nghệ thuật. Graphic tees và outerwear là những items cực kỳ đáng sưu tầm.",
    },
}

# =====================================================
# STORE POLICIES
# =====================================================

STORE_POLICIES = {
    "consignment": """🏷️ **Chính sách Ký gửi AURA ARCHIVE:**

• Chúng tôi nhận ký gửi các sản phẩm designer chính hãng
• Sản phẩm phải trong tình trạng tốt (từ 7/10 trở lên)
• Commission: 15-25% tùy giá trị sản phẩm
• Quy trình: Gửi ảnh → Xác thực → Định giá → Đăng bán
• Thanh toán sau khi sản phẩm bán thành công
• Liên hệ để biết thêm chi tiết!""",

    "shipping": """🚚 **Chính sách Vận chuyển:**

• Miễn phí vận chuyển đơn hàng trên 5 triệu VND
• Giao hàng toàn quốc qua GHTK, GHN, J&T
• Thời gian: HCM (1-2 ngày), tỉnh khác (3-5 ngày)
• Đóng gói cẩn thận, bảo vệ sản phẩm tối đa
• Có tracking number theo dõi đơn hàng""",

    "authenticity": """✅ **Cam kết Chính hãng 100%:**

• Mọi sản phẩm được xác thực bởi đội ngũ chuyên gia
• Kiểm tra: tag, label, stitching, material, serial number
• Hoàn tiền 200% nếu phát hiện hàng giả
• Certificate of Authenticity đi kèm sản phẩm
• Hợp tác với entrupy/legit check service""",

    "return": """↩️ **Chính sách Đổi trả:**

• Đổi/trả trong vòng 3 ngày kể từ khi nhận hàng
• Sản phẩm phải còn nguyên tag, chưa sử dụng
• Không áp dụng cho sản phẩm sale/giảm giá
• Hoàn tiền qua phương thức thanh toán ban đầu
• Liên hệ trước khi gửi trả""",

    "payment": """💳 **Phương thức thanh toán:**

• COD (Thanh toán khi nhận hàng)
• Chuyển khoản ngân hàng
• MoMo
• VNPay
• PayPal (cho khách quốc tế)
• VietQR""",
}

# =====================================================
# SIZE GUIDE
# =====================================================

SIZE_GUIDE = {
    "general": {
        "XS": {"height": "155-162cm", "weight": "45-52kg", "chest": "80-84cm"},
        "S": {"height": "160-168cm", "weight": "52-60kg", "chest": "84-88cm"},
        "M": {"height": "165-175cm", "weight": "60-70kg", "chest": "88-92cm"},
        "L": {"height": "172-180cm", "weight": "70-80kg", "chest": "92-96cm"},
        "XL": {"height": "178-188cm", "weight": "80-90kg", "chest": "96-100cm"},
    },
    "tips": [
        "Hàng Nhật (Yohji, CDG, Issey, Undercover) thường nhỏ hơn EU/US 1 size",
        "Rick Owens: phom oversized sẵn, lấy true-to-size",
        "Balenciaga: oversized fit, có thể size down",
        "Fear of God: relaxed fit, true-to-size cho oversized look",
        "Giày Tabi (Margiela): lấy đúng size hoặc +0.5",
        "Giày Rick Owens: thường đúng size EU",
    ],
}


# =====================================================
# STYLING ADVICE
# =====================================================

STYLE_ADVICE = {
    "techwear": {
        "description": "Phong cách techwear kết hợp công nghệ vải hiện đại với thiết kế đô thị chức năng",
        "brands": ["Acronym", "Rick Owens"],
        "key_items": ["GORE-TEX jacket", "cargo pants", "technical sneakers"],
        "tips": [
            "Layering là chìa khóa — áo lót + áo giữ + shell jacket",
            "Chọn tông đen/xám/olive để phối dễ",
            "Túi đeo chéo hoặc sling bag là phụ kiện hoàn hảo",
            "Giày technical (sneakers, boots) phù hợp nhất"
        ],
        "occasions": "Đi chơi, street, casual, outdoor activities",
    },
    "avant-garde": {
        "description": "Phong cách avant-garde phá vỡ quy tắc, tạo silhouette độc đáo",
        "brands": ["Rick Owens", "Yohji Yamamoto", "Comme des Garçons", "Maison Margiela"],
        "key_items": ["Draped jacket", "wide-leg pants", "platform boots"],
        "tips": [
            "All-black là foundation — từ đó thêm layers",
            "Mix proportions: oversized top + slim bottom hoặc ngược lại",
            "Một statement piece đủ, không cần quá nhiều",
            "Chất liệu quan trọng — len, linen, da"
        ],
        "occasions": "Events, art galleries, creative spaces, everyday wear",
    },
    "minimalist": {
        "description": "Tối giản nhưng tinh tế — chất lượng hơn số lượng",
        "brands": ["The Row", "Lemaire", "Issey Miyake"],
        "key_items": ["Clean-cut trousers", "cashmere sweater", "structured tote"],
        "tips": [
            "Neutral palette: đen, trắng, kem, xám, navy",
            "Fit vừa vặn, clean silhouette",
            "Ít phụ kiện — chọn 1-2 items chất lượng",
            "Chất liệu cao cấp tạo sự khác biệt"
        ],
        "occasions": "Công sở, business casual, everyday elegance",
    },
    "streetwear": {
        "description": "Streetwear luxury — kết hợp culture đường phố với high fashion",
        "brands": ["Balenciaga", "Fear of God", "Off-White", "Raf Simons"],
        "key_items": ["Oversized hoodie", "chunky sneakers", "graphic tee"],
        "tips": [
            "Oversized fit là key",
            "Sneakers là trung tâm của outfit",
            "Layer với hoodie/vest/jacket",
            "Earth tones hoặc bold colors"
        ],
        "occasions": "Đi chơi, hangout, casual, concerts",
    },
}


# =====================================================
# CUSTOMER PROFILING QUESTIONS
# =====================================================

PROFILE_QUESTIONS = {
    "height": "Bạn cao bao nhiêu ạ? (ví dụ: 170cm) 📏",
    "weight": "Cân nặng của bạn khoảng bao nhiêu ạ? (ví dụ: 65kg) ⚖️",
    "style": "Bạn thích phong cách nào? (minimalist, streetwear, techwear, avant-garde, casual...) 🎨",
    "occasion": "Bạn đang tìm đồ cho dịp gì ạ? (đi chơi, công sở, party, hàng ngày...) 📅",
    "budget": "Ngân sách tầm bao nhiêu ạ? (ví dụ: 10-20 triệu) 💰",
    "color": "Bạn thích tone màu gì? (đen, trắng, earth tone, bright colors...) 🎨",
    "gender": "Bạn tìm đồ nam hay nữ ạ? 👤",
}


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def get_brand_info(brand_name: str) -> Optional[Dict[str, Any]]:
    """Get brand info by name (case-insensitive partial match)"""
    brand_lower = brand_name.lower()
    for name, info in BRANDS.items():
        if brand_lower in name.lower() or name.lower() in brand_lower:
            return {"name": name, **info}
    return None


def get_style_advice(style: str) -> Optional[Dict[str, Any]]:
    """Get styling advice for a given style"""
    style_lower = style.lower()
    for name, advice in STYLE_ADVICE.items():
        if style_lower in name or name in style_lower:
            return {"name": name, **advice}
    return None


def suggest_size(height_cm: int = None, weight_kg: int = None) -> str:
    """Suggest size based on body measurements"""
    if not height_cm and not weight_kg:
        return "Bạn cho mình biết chiều cao và cân nặng để tư vấn size chính xác nhé! 📏"
    
    suggested = "M"  # default
    
    if height_cm and weight_kg:
        bmi_like = weight_kg / (height_cm / 100) ** 2
        if height_cm < 163 and weight_kg < 55:
            suggested = "XS"
        elif height_cm < 170 and weight_kg < 63:
            suggested = "S"
        elif height_cm < 177 and weight_kg < 73:
            suggested = "M"
        elif height_cm < 183 and weight_kg < 83:
            suggested = "L"
        else:
            suggested = "XL"
    elif height_cm:
        if height_cm < 163:
            suggested = "XS"
        elif height_cm < 170:
            suggested = "S"
        elif height_cm < 177:
            suggested = "M"
        elif height_cm < 183:
            suggested = "L"
        else:
            suggested = "XL"
    elif weight_kg:
        if weight_kg < 52:
            suggested = "XS"
        elif weight_kg < 62:
            suggested = "S"
        elif weight_kg < 72:
            suggested = "M"
        elif weight_kg < 82:
            suggested = "L"
        else:
            suggested = "XL"
    
    guide = SIZE_GUIDE["general"].get(suggested, {})
    tips = SIZE_GUIDE["tips"]
    
    result = f"📐 Với thông số của bạn"
    if height_cm:
        result += f" (cao {height_cm}cm"
    if weight_kg:
        result += f", {weight_kg}kg" if height_cm else f" ({weight_kg}kg"
    result += f"), mình khuyên bạn chọn **size {suggested}**.\n\n"
    
    if guide:
        result += f"Size {suggested}: {guide.get('height', '')}, {guide.get('weight', '')}\n\n"
    
    result += "💡 **Lưu ý theo brand:**\n"
    for tip in tips[:3]:
        result += f"• {tip}\n"
    
    return result


def get_missing_profile_fields(session_context: Dict[str, Any]) -> List[str]:
    """Check which profile fields are still missing for better recommendation"""
    important_fields = ["height_cm", "weight_kg", "style", "gender"]
    missing = []
    for field in important_fields:
        if field not in session_context or not session_context[field]:
            missing.append(field)
    return missing


def format_product_recommendation(product: Dict[str, Any], reason: str = "") -> str:
    """Format a single product as a recommendation message"""
    name = product.get("name", "Unknown")
    brand = product.get("brand", "")
    slug = product.get("slug", "")
    base_price = product.get("base_price", 0)
    sale_price = product.get("sale_price")
    category = product.get("category", "")
    condition = product.get("condition_text", "")
    
    # Format price
    price_str = ""
    if sale_price:
        price_str = f"~~{int(float(base_price)):,}₫~~ → **{int(float(sale_price)):,}₫** 🔥"
    elif base_price:
        price_str = f"**{int(float(base_price)):,}₫**"
    
    # Build variant info
    variants = product.get("variants", [])
    variant_info = ""
    if variants:
        v = variants[0] if isinstance(variants, list) else variants
        if isinstance(v, dict):
            parts = []
            if v.get("size"):
                parts.append(f"Size {v['size']}")
            if v.get("color"):
                parts.append(v["color"])
            if v.get("status") == "AVAILABLE":
                parts.append("✅ Còn hàng")
            elif v.get("status") == "SOLD":
                parts.append("❌ Đã bán")
            variant_info = " · ".join(parts)
    
    # Build message
    msg = f"👗 **{name}**\n"
    msg += f"   Brand: {brand} | {category}\n"
    if condition:
        msg += f"   Tình trạng: {condition}\n"
    if variant_info:
        msg += f"   {variant_info}\n"
    msg += f"   Giá: {price_str}\n"
    if slug:
        msg += f"   🔗 Xem chi tiết: /shop/{slug}\n"
    if reason:
        msg += f"   💡 {reason}\n"
    
    return msg
