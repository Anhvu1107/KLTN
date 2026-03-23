"""
AI Stylist Engine — Hybrid Mode
AURA ARCHIVE - Combines trained knowledge base with optional AI API (OpenAI/Gemini)

Flow:
    User Message → Intent Classify → Entity Extract → Knowledge Enrich
        ├── HAS API Key → Build enriched prompt → AI generates natural response
        └── NO API Key  → Use template responses with real product data
"""

from typing import Optional, List, Dict, Any
import time

from app.core.config import settings
from app.services.intent_classifier import classify_intent, extract_entities, extract_search_query
from app.services import knowledge_base as kb
from app.services import product_search

# Session TTL in seconds (30 minutes)
SESSION_TTL = 30 * 60


class StylistEngine:
    """
    Hybrid AI Stylist Engine for AURA ARCHIVE.
    Works with or without external API keys.
    """
    
    def __init__(self):
        # OpenAI client
        self.openai_client = None
        if settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            except Exception:
                pass
        
        # Gemini client
        self.gemini_model = None
        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
            except Exception:
                pass
        
        self.has_api = bool(self.openai_client or self.gemini_model)
        self.mode = settings.CHATBOT_MODE  # auto, api_only, trained_only
        
        # Session storage: {session_id: {messages, context, last_access}}
        self.sessions: Dict[str, Dict[str, Any]] = {}
        
        # System prompt for AI API mode
        self.system_prompt_template = """Bạn là AURA, một stylist thời trang AI chuyên nghiệp cho AURA ARCHIVE — một nền tảng mua bán đồ hiệu secondhand (consignment).

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

NHẮC LẠI: Mọi thông tin bạn cung cấp PHẢI đến từ CONTEXT DATA bên dưới. Nếu CONTEXT DATA không chứa thông tin, bạn KHÔNG CÓ thông tin đó."""

        print(f"[StylistEngine] Initialized — API: {'✓' if self.has_api else '✗'}, Mode: {self.mode}")

    async def process_message(
        self,
        message: str,
        session_id: str,
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process a user message with hybrid intelligence.
        """
        # Cleanup expired sessions
        self._cleanup_expired_sessions()
        
        # Init or update session
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "messages": [],
                "context": {},  # Accumulated customer profile
                "last_access": time.time(),
            }
        
        session = self.sessions[session_id]
        session["last_access"] = time.time()
        
        # Add user message to history
        session["messages"].append({"role": "user", "content": message})
        
        # ===== STEP 1: Classify intent =====
        intent, confidence = classify_intent(message)
        
        # ===== STEP 2: Extract entities =====
        entities = extract_entities(message)
        
        # Update session context with new entities
        for key, value in entities.items():
            session["context"][key] = value
        
        # ===== STEP 3: Enrich with product data & knowledge =====
        enrichment = await self._enrich_context(intent, entities, session["context"], message)
        
        # ===== STEP 4: Generate response (hybrid) =====
        use_api = (
            self.has_api
            and self.mode != "trained_only"
        )
        
        if use_api:
            response_text = await self._generate_api_response(
                message, session, intent, entities, enrichment, system_prompt
            )
        else:
            response_text = await self._generate_trained_response(
                message, session, intent, entities, enrichment
            )
        
        # Add response to history
        session["messages"].append({"role": "assistant", "content": response_text})
        
        return {
            "message": response_text,
            "metadata": {
                "intent": intent,
                "confidence": confidence,
                "entities": entities,
                "mode": "api" if use_api else "trained",
                "has_products": bool(enrichment.get("products")),
            },
        }

    async def _enrich_context(
        self,
        intent: str,
        entities: Dict[str, Any],
        session_context: Dict[str, Any],
        message: str,
    ) -> Dict[str, Any]:
        """
        Gather relevant data based on intent:
        - Product search results
        - Brand info from KB
        - Style advice
        - Size recommendations
        """
        enrichment: Dict[str, Any] = {}
        
        # Determine if we should search for products
        # Trigger product search broadly — any intent that may involve product recommendation
        should_search_products = (
            intent in ("PRODUCT_SEARCH", "CATEGORY_BROWSE", "PRICE_INQUIRY", "STYLE_ADVICE", "INVENTORY_CHECK")
            or "category" in entities
            or "brand" in entities
            or "color" in entities
        )
        
        # --- Product search for relevant intents ---
        if should_search_products:
            search_query = extract_search_query(message, entities)
            products = await product_search.search_products(
                search=search_query,
                category=entities.get("category"),
                brand=entities.get("brand"),
                color=entities.get("color"),
                min_price=int(entities["price_hint"] * 0.7) if "price_hint" in entities else None,
                max_price=int(entities["price_hint"] * 1.3) if "price_hint" in entities else None,
                limit=5,
            )
            
            # If strict search returned nothing, try a broader search
            if not products and (entities.get("category") or entities.get("brand")):
                print(f"[StylistEngine] Strict search returned 0 results, trying broader search...")
                products = await product_search.search_products(
                    search=search_query,
                    limit=5,
                )
            
            enrichment["products"] = products
            enrichment["product_context"] = product_search.build_product_context_for_ai(products)
        
        # --- Brand info ---
        if intent == "BRAND_INFO" or "brand" in entities:
            brand_name = entities.get("brand", "")
            if brand_name:
                brand_info = kb.get_brand_info(brand_name)
                if brand_info:
                    enrichment["brand_info"] = brand_info
        
        # --- Style advice ---
        if intent == "STYLE_ADVICE":
            styles = entities.get("style", [])
            if styles:
                style_info = kb.get_style_advice(styles[0])
                if style_info:
                    enrichment["style_advice"] = style_info
            
            # Also search products matching the style
            if not enrichment.get("products"):
                style_brands = style_info.get("brands", []) if style_info else []
                if style_brands:
                    products = await product_search.search_products(
                        brand=style_brands[0] if style_brands else None,
                        limit=4,
                    )
                    enrichment["products"] = products
                    enrichment["product_context"] = product_search.build_product_context_for_ai(products)
        
        # --- Size help ---
        if intent == "SIZE_HELP" or "height_cm" in entities or "weight_kg" in entities:
            height = entities.get("height_cm") or session_context.get("height_cm")
            weight = entities.get("weight_kg") or session_context.get("weight_kg")
            enrichment["size_advice"] = kb.suggest_size(height, weight)
        
        # --- Inventory check ---
        if intent == "INVENTORY_CHECK":
            inventory = await product_search.get_inventory_summary()
            if inventory:
                enrichment["inventory_summary"] = inventory
                enrichment["inventory_context"] = product_search.build_inventory_context_for_ai(inventory)
            
            # Also fetch some sample products if none were found yet
            if not enrichment.get("products"):
                products = await product_search.search_products(limit=5)
                enrichment["products"] = products
                enrichment["product_context"] = product_search.build_product_context_for_ai(products)
        
        # --- Authenticity ---
        if intent == "AUTHENTICITY":
            enrichment["policy"] = kb.STORE_POLICIES["authenticity"]
        
        # --- Consignment ---
        if intent == "CONSIGNMENT":
            enrichment["policy"] = kb.STORE_POLICIES["consignment"]
        
        # --- Order status ---
        if intent == "ORDER_STATUS":
            enrichment["policy"] = kb.STORE_POLICIES["shipping"]
        
        return enrichment

    async def _generate_api_response(
        self,
        message: str,
        session: Dict[str, Any],
        intent: str,
        entities: Dict[str, Any],
        enrichment: Dict[str, Any],
        custom_system_prompt: Optional[str] = None,
    ) -> str:
        """
        Generate response using AI API (OpenAI or Gemini) with enriched context.
        The AI gets real product data + knowledge base info as context.
        """
        # Build system prompt with enrichment
        prompt = custom_system_prompt or self.system_prompt_template
        
        # Add enrichment context
        context_parts = [prompt, "\n\n--- CONTEXT DATA ---"]
        
        if enrichment.get("products"):
            context_parts.append(f"\n📦 SẢN PHẨM TÌM ĐƯỢC:\n{enrichment['product_context']}")
            context_parts.append("\n⚠️ NHẮC LẠI: Bạn CHỈ ĐƯỢC giới thiệu các sản phẩm ở danh sách trên. KHÔNG ĐƯỢC bịa thêm sản phẩm nào khác.")
        else:
            context_parts.append(
                "\n📦 SẢN PHẨM TÌM ĐƯỢC: KHÔNG CÓ sản phẩm nào phù hợp trong kho hàng.\n"
                "⛔ NGHIÊM CẤM: KHÔNG ĐƯỢC bịa ra sản phẩm. Hãy nói với khách rằng hiện tại shop chưa có sản phẩm phù hợp, "
                "và hỏi khách có muốn thử tiêu chí khác không (ví dụ: brand khác, loại khác, giá khác)."
            )
        
        if enrichment.get("brand_info"):
            bi = enrichment["brand_info"]
            context_parts.append(
                f"\n🏷️ BRAND INFO — {bi.get('name', '')}:\n"
                f"Origin: {bi.get('origin', '')}\n"
                f"Style: {bi.get('style', '')}\n"
                f"Signature: {bi.get('signature', '')}\n"
                f"Price range: {bi.get('price_range', '')}\n"
                f"Fits: {bi.get('fits', '')}\n"
                f"Best for: {bi.get('best_for', '')}\n"
                f"Description: {bi.get('description', '')}"
            )
        
        if enrichment.get("style_advice"):
            sa = enrichment["style_advice"]
            context_parts.append(
                f"\n🎨 STYLE ADVICE — {sa.get('name', '')}:\n"
                f"Description: {sa.get('description', '')}\n"
                f"Key items: {', '.join(sa.get('key_items', []))}\n"
                f"Tips: {chr(10).join('• ' + t for t in sa.get('tips', []))}\n"
                f"Occasions: {sa.get('occasions', '')}"
            )
        
        if enrichment.get("size_advice"):
            context_parts.append(f"\n📐 SIZE ADVICE:\n{enrichment['size_advice']}")
        
        if enrichment.get("policy"):
            context_parts.append(f"\n📋 POLICY INFO:\n{enrichment['policy']}")
        
        if enrichment.get("inventory_context"):
            context_parts.append(f"\n📊 TỔNG QUAN KHO HÀNG:\n{enrichment['inventory_context']}")
            context_parts.append("\n⚠️ CHỈ sử dụng số liệu kho hàng ở trên để trả lời. KHÔNG ĐƯỢC tự nghĩ ra số liệu.")
        
        # Add customer profile context
        ctx = session.get("context", {})
        if ctx:
            profile_parts = []
            if ctx.get("height_cm"): profile_parts.append(f"Cao: {ctx['height_cm']}cm")
            if ctx.get("weight_kg"): profile_parts.append(f"Nặng: {ctx['weight_kg']}kg")
            if ctx.get("gender"): profile_parts.append(f"Giới tính: {ctx['gender']}")
            if ctx.get("style"): profile_parts.append(f"Style: {', '.join(ctx['style'])}")
            if ctx.get("color"): profile_parts.append(f"Màu yêu thích: {ctx['color']}")
            if profile_parts:
                context_parts.append(f"\n👤 CUSTOMER PROFILE:\n{', '.join(profile_parts)}")
        
        # Check what profile info is missing for better recommendations
        missing = kb.get_missing_profile_fields(ctx)
        if missing and intent in ("PRODUCT_SEARCH", "STYLE_ADVICE", "CATEGORY_BROWSE"):
            field_names = {"height_cm": "chiều cao", "weight_kg": "cân nặng", "style": "phong cách", "gender": "giới tính"}
            missing_names = [field_names.get(f, f) for f in missing]
            context_parts.append(
                f"\n⚠️ CHƯA BIẾT: {', '.join(missing_names)} — hãy khéo léo hỏi khách để tư vấn tốt hơn"
            )
        
        full_system_prompt = "\n".join(context_parts)
        
        print(f"[StylistEngine] API mode — Products found: {len(enrichment.get('products', []))}, Intent: {intent}")
        
        # Build message history (last 10 messages)
        messages = [{"role": "system", "content": full_system_prompt}]
        messages.extend(session["messages"][-10:])
        
        try:
            # Try Gemini first, then OpenAI
            if self.gemini_model:
                return await self._call_gemini(messages)
            elif self.openai_client:
                return await self._call_openai(messages)
            else:
                # Fallback to trained mode
                return await self._generate_trained_response(
                    message, session, intent, entities, enrichment
                )
        except Exception as e:
            print(f"[StylistEngine] API error: {e}")
            # Fallback to trained mode on error
            return await self._generate_trained_response(
                message, session, intent, entities, enrichment
            )

    async def _call_gemini(self, messages: List[Dict[str, str]]) -> str:
        """Call Gemini API"""
        # Convert messages to Gemini format
        system_msg = messages[0]["content"] if messages and messages[0]["role"] == "system" else ""
        
        # Build conversation history for Gemini
        history = []
        for msg in messages[1:]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})
        
        # Use generate_content with the full context
        chat = self.gemini_model.start_chat(history=history[:-1] if len(history) > 1 else [])
        
        # Include system prompt in the last user message context
        last_msg = history[-1]["parts"][0] if history else ""
        full_prompt = f"{system_msg}\n\n---\nUser message: {last_msg}" if system_msg else last_msg
        
        response = await chat.send_message_async(full_prompt)
        return response.text

    async def _call_openai(self, messages: List[Dict[str, str]]) -> str:
        """Call OpenAI API"""
        completion = await self.openai_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            max_tokens=800,
            temperature=0.7,
        )
        return completion.choices[0].message.content

    async def _generate_trained_response(
        self,
        message: str,
        session: Dict[str, Any],
        intent: str,
        entities: Dict[str, Any],
        enrichment: Dict[str, Any],
    ) -> str:
        """
        Generate response using trained knowledge base (no API key needed).
        Uses templates + real product data for accurate, helpful responses.
        """
        ctx = session.get("context", {})
        
        # ===== GREETING =====
        if intent == "GREETING":
            return (
                "Chào bạn, mình là AURA — trợ lý thời trang của AURA ARCHIVE.\n\n"
                "Mình có thể giúp bạn:\n"
                "• Tìm kiếm sản phẩm designer\n"
                "• Tư vấn phong cách phù hợp\n"
                "• Hướng dẫn chọn size\n"
                "• Giới thiệu các thương hiệu\n\n"
                "Để mình tư vấn tốt nhất, bạn cho mình biết **chiều cao, cân nặng** và **phong cách yêu thích** nhé!"
            )
        
        # ===== FAREWELL =====
        if intent == "FAREWELL":
            return (
                "Cảm ơn bạn đã ghé thăm AURA ARCHIVE!\n"
                "Nếu cần tư vấn thêm, cứ nhắn tin cho mình bất cứ lúc nào nhé.\n"
                "Chúc bạn tìm được item ưng ý."
            )
        
        # ===== PRODUCT SEARCH =====
        if intent in ("PRODUCT_SEARCH", "CATEGORY_BROWSE"):
            products = enrichment.get("products", [])
            if products:
                response = "Mình tìm được những sản phẩm này cho bạn:\n\n"
                for p in products[:4]:
                    reason = self._generate_product_reason(p, ctx)
                    response += kb.format_product_recommendation(p, reason) + "\n"
                
                # Ask for more info if profile incomplete
                missing = kb.get_missing_profile_fields(ctx)
                if missing:
                    response += "\nĐể tư vấn chính xác hơn, "
                    if "height_cm" in missing or "weight_kg" in missing:
                        response += "bạn cho mình biết **chiều cao** và **cân nặng** nhé!"
                    elif "style" in missing:
                        response += "bạn thích **phong cách** nào? (minimalist, streetwear, techwear, avant-garde)"
                
                return response
            else:
                return (
                    "Mình chưa tìm thấy sản phẩm phù hợp với yêu cầu của bạn.\n\n"
                    "Bạn có thể thử:\n"
                    "• Tìm theo brand: **Rick Owens**, **CDG**, **Yohji**\n"
                    "• Tìm theo loại: giày, áo khoác, túi\n"
                    "• Tìm theo giá: tầm 15 triệu\n\n"
                    "Hoặc cho mình biết phong cách bạn thích, mình sẽ gợi ý nhé!"
                )
        
        # ===== BRAND INFO =====
        if intent == "BRAND_INFO":
            brand_info = enrichment.get("brand_info")
            if brand_info:
                bi = brand_info
                response = f"**{bi['name']}**\n\n"
                response += f"Xuất xứ: {bi.get('origin', '')}\n"
                response += f"Phong cách: {bi.get('style', '')}\n"
                response += f"Đặc trưng: {bi.get('signature', '')}\n"
                response += f"Tầm giá: {bi.get('price_range', '')}\n"
                response += f"Phù hợp: {bi.get('best_for', '')}\n\n"
                response += f"{bi.get('description', '')}\n\n"
                response += f"Hướng dẫn size: {bi.get('fits', '')}\n\n"
                
                # Also show products from this brand
                products = enrichment.get("products", [])
                if not products and "brand" in entities:
                    products = await product_search.search_products(brand=entities["brand"], limit=3)
                
                if products:
                    response += f"Sản phẩm **{bi['name']}** đang có:\n\n"
                    for p in products[:3]:
                        response += kb.format_product_recommendation(p) + "\n"
                
                return response
            else:
                return (
                    "Mình có thông tin chi tiết về các brand sau:\n"
                    "**Rick Owens**, **Acronym**, **CDG**, **Yohji Yamamoto**, **Issey Miyake**, "
                    "**Maison Margiela**, **Raf Simons**, **Balenciaga**, **Fear of God**, **Undercover**\n\n"
                    "Bạn muốn tìm hiểu về brand nào?"
                )
        
        # ===== PRICE INQUIRY =====
        if intent == "PRICE_INQUIRY":
            products = enrichment.get("products", [])
            if products:
                price_hint = entities.get("price_hint", 0)
                if price_hint:
                    response = f"Với tầm giá {price_hint:,}₫, mình có những lựa chọn sau:\n\n"
                else:
                    response = "Đây là một số sản phẩm với giá tốt:\n\n"
                
                for p in products[:4]:
                    reason = self._generate_product_reason(p, ctx)
                    response += kb.format_product_recommendation(p, reason) + "\n"
                
                return response
            else:
                return (
                    "Bạn cho mình biết **ngân sách** tầm bao nhiêu nhé!\n"
                    "Ví dụ: 'tầm 15 triệu', 'dưới 20 triệu', '$500'\n\n"
                    "AURA ARCHIVE có sản phẩm từ khoảng **5 triệu** đến **75 triệu VND**."
                )
        
        # ===== STYLE ADVICE =====
        if intent == "STYLE_ADVICE":
            style_info = enrichment.get("style_advice")
            products = enrichment.get("products", [])
            
            if style_info:
                sa = style_info
                response = f"**Phong cách {sa['name'].title()}**\n\n"
                response += f"{sa.get('description', '')}\n\n"
                response += "Key items:\n"
                for item in sa.get("key_items", []):
                    response += f"  • {item}\n"
                response += "\nTips phối đồ:\n"
                for tip in sa.get("tips", []):
                    response += f"  • {tip}\n"
                response += f"\nPhù hợp: {sa.get('occasions', '')}\n"
                response += f"\nBrands gợi ý: {', '.join(sa.get('brands', []))}\n"
                
                if products:
                    response += "\nSản phẩm gợi ý:\n\n"
                    for p in products[:3]:
                        reason = self._generate_product_reason(p, ctx)
                        response += kb.format_product_recommendation(p, reason) + "\n"
                
                return response
            else:
                return (
                    "Mình có thể tư vấn các phong cách:\n\n"
                    "• **Avant-garde** — Rick Owens, Yohji, CDG\n"
                    "• **Techwear** — Acronym, technical fabrics\n"
                    "• **Streetwear** — Balenciaga, Fear of God, Off-White\n"
                    "• **Minimalist** — The Row, Lemaire, Issey Miyake\n\n"
                    "Bạn thích phong cách nào? Hoặc cho mình biết dịp mặc (đi chơi, công sở, party...) "
                    "để mình tư vấn phù hợp nhé!"
                )
        
        # ===== SIZE HELP =====
        if intent == "SIZE_HELP" or intent == "CUSTOMER_PROFILE":
            size_advice = enrichment.get("size_advice")
            if size_advice:
                return size_advice
            else:
                return kb.suggest_size(
                    ctx.get("height_cm"),
                    ctx.get("weight_kg"),
                )
        
        # ===== INVENTORY CHECK =====
        if intent == "INVENTORY_CHECK":
            inventory = enrichment.get("inventory_summary", {})
            products = enrichment.get("products", [])
            
            if inventory:
                total = inventory.get("total_products", 0)
                available = inventory.get("total_available", 0)
                categories = inventory.get("categories", [])
                brands = inventory.get("top_brands", [])
                price_range = inventory.get("price_range", {})
                
                response = f"Hiện tại AURA ARCHIVE đang có **{total} sản phẩm** với **{available} variant còn hàng**.\n\n"
                
                if categories:
                    response += "**Phân loại theo danh mục:**\n"
                    for cat in categories:
                        cat_name = cat.get('category', 'N/A')
                        cat_count = cat.get('product_count', 0)
                        response += f"  • {cat_name}: {cat_count} sản phẩm\n"
                    response += "\n"
                
                if brands:
                    response += "**Top brands đang có:**\n"
                    for b in brands:
                        b_name = b.get('brand', 'N/A')
                        b_count = b.get('product_count', 0)
                        response += f"  • {b_name}: {b_count} sản phẩm\n"
                    response += "\n"
                
                if price_range:
                    min_p = price_range.get('min', 0)
                    max_p = price_range.get('max', 0)
                    if min_p and max_p:
                        response += f"**Tầm giá:** {int(float(min_p)):,}₫ – {int(float(max_p)):,}₫\n\n"
                
                if products:
                    response += "Một số sản phẩm tiêu biểu:\n\n"
                    for p in products[:3]:
                        reason = self._generate_product_reason(p, ctx)
                        response += kb.format_product_recommendation(p, reason) + "\n"
                
                response += "\nBạn muốn tìm sản phẩm thuộc danh mục hoặc brand nào cụ thể?"
                return response
            else:
                return (
                    "Xin lỗi, mình không thể lấy thông tin kho hàng lúc này.\n"
                    "Bạn có thể thử hỏi về sản phẩm cụ thể (ví dụ: 'Tìm giày Rick Owens') "
                    "và mình sẽ tìm trong kho nhé!"
                )
        
        # ===== CONSIGNMENT =====
        if intent == "CONSIGNMENT":
            return enrichment.get("policy", kb.STORE_POLICIES["consignment"])
        
        # ===== AUTHENTICITY =====
        if intent == "AUTHENTICITY":
            return enrichment.get("policy", kb.STORE_POLICIES["authenticity"])
        
        # ===== ORDER STATUS =====
        if intent == "ORDER_STATUS":
            return (
                enrichment.get("policy", kb.STORE_POLICIES["shipping"]) +
                "\n\nĐể kiểm tra đơn hàng, bạn vào mục **Tài khoản → Đơn hàng** trên website nhé!"
            )
        
        # ===== FALLBACK =====
        # Check if user is giving profile info
        if any(k in entities for k in ["height_cm", "weight_kg", "gender", "style"]):
            response = "Cảm ơn bạn đã chia sẻ! Mình đã ghi nhận:\n"
            if "height_cm" in entities:
                response += f"  Chiều cao: **{entities['height_cm']}cm**\n"
            if "weight_kg" in entities:
                response += f"  Cân nặng: **{entities['weight_kg']}kg**\n"
            if "gender" in entities:
                response += f"  Giới tính: **{'Nam' if entities['gender'] == 'male' else 'Nữ'}**\n"
            if "style" in entities:
                response += f"  Phong cách: **{', '.join(entities['style'])}**\n"
            
            response += "\nBạn muốn mình tìm sản phẩm gì? Hoặc cho mình biết thêm sở thích để tư vấn nhé!"
            
            # If we have enough info, proactively suggest products
            if ctx.get("height_cm") or ctx.get("weight_kg"):
                products = await product_search.search_products(limit=3)
                if products:
                    response += "\n\nMột vài gợi ý cho bạn:\n\n"
                    for p in products[:3]:
                        reason = self._generate_product_reason(p, ctx)
                        response += kb.format_product_recommendation(p, reason) + "\n"
            
            return response
        
        return (
            "Mình có thể giúp bạn:\n\n"
            "• **Tìm sản phẩm**: 'Tìm giày Rick Owens', 'Có áo khoác nào không?'\n"
            "• **Tìm hiểu brand**: 'Giới thiệu về CDG', 'Kể về Yohji'\n"
            "• **Tư vấn phong cách**: 'Style techwear', 'Phối đồ đi party'\n"
            "• **Chọn size**: 'Cao 170 nặng 65 mặc size gì?'\n"
            "• **Tìm theo giá**: 'Có gì tầm 15 triệu?'\n"
            "• **Chính sách**: 'Ký gửi', 'Đổi trả', 'Vận chuyển'\n\n"
            "Hãy cho mình biết bạn đang tìm gì nhé!"
        )

    def _generate_product_reason(
        self, product: Dict[str, Any], ctx: Dict[str, Any]
    ) -> str:
        """Generate a personalized reason why a product suits the customer"""
        reasons = []
        brand = product.get("brand", "")
        category = product.get("category", "")
        
        # Check size compatibility
        if ctx.get("height_cm"):
            h = ctx["height_cm"]
            if h < 170:
                reasons.append("Form dáng phù hợp với người nhỏ nhắn")
            elif h > 180:
                reasons.append("Cut dài vừa với chiều cao của bạn")
        
        # Check style match
        styles = ctx.get("style", [])
        brand_lower = brand.lower()
        if "techwear" in styles and brand_lower in ("acronym", "rick owens"):
            reasons.append("Đúng phong cách techwear bạn thích")
        if "minimalist" in styles and brand_lower in ("the row", "lemaire", "issey miyake"):
            reasons.append("Phù hợp phong cách tối giản của bạn")
        if "streetwear" in styles and brand_lower in ("balenciaga", "fear of god", "off-white"):
            reasons.append("Đúng gu streetwear của bạn")
        if "avant-garde" in styles and brand_lower in ("rick owens", "yohji yamamoto", "comme des garçons"):
            reasons.append("Phong cách avant-garde bạn yêu thích")
        
        # Check color match
        if ctx.get("color"):
            variants = product.get("variants", [])
            if variants:
                v = variants[0] if isinstance(variants, list) and len(variants) > 0 else {}
                if isinstance(v, dict) and v.get("color", "").lower() == ctx["color"].lower():
                    reasons.append(f"Màu {ctx['color']} như bạn thích")
        
        # Sale price
        if product.get("sale_price"):
            reasons.append("Đang giảm giá")
        
        # Condition
        condition = product.get("condition_text", "")
        if "10/10" in condition or "New" in condition:
            reasons.append("Tình trạng mới 100%")
        elif "9/10" in condition:
            reasons.append("Gần như mới, tình trạng tuyệt vời")
        
        return " · ".join(reasons) if reasons else "Sản phẩm chất lượng từ AURA ARCHIVE"

    async def get_session_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get conversation history for a session"""
        session = self.sessions.get(session_id)
        if session:
            session["last_access"] = time.time()
            return session["messages"]
        return []
    
    def _cleanup_expired_sessions(self) -> None:
        """Remove expired sessions to prevent memory leaks"""
        current_time = time.time()
        expired = [
            sid for sid, data in self.sessions.items()
            if current_time - data.get("last_access", 0) > SESSION_TTL
        ]
        for sid in expired:
            del self.sessions[sid]
        if expired:
            print(f"[StylistEngine] Cleaned up {len(expired)} expired sessions")
