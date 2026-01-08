"""
AI Stylist Engine
AURA ARCHIVE - Core AI logic with dynamic system prompt support
"""

from typing import Optional, List, Dict, Any
from openai import AsyncOpenAI

from app.core.config import settings


class StylistEngine:
    """
    AI Stylist Engine for AURA ARCHIVE.
    Handles conversation with OpenAI and supports dynamic system prompts.
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.model = settings.OPENAI_MODEL
        self.sessions: Dict[str, List[Dict[str, str]]] = {}
        
        # Default system prompt (used if none provided from Node.js)
        self.default_system_prompt = """You are AURA, an elegant and knowledgeable AI fashion stylist for AURA ARCHIVE, 
a luxury consignment platform specializing in pre-owned designer fashion.

Your personality:
- Sophisticated yet approachable, like a personal shopper at a high-end boutique
- Passionate about sustainable luxury and the stories behind each piece
- Knowledgeable about designer brands, fashion history, and styling
- Helpful in finding the perfect piece for any occasion

Communication style:
- Use elegant but not overly formal language
- Be concise but thorough
- Show genuine enthusiasm for fashion
- Personalize recommendations when possible"""

    async def process_message(
        self,
        message: str,
        session_id: str,
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process a user message and generate AI response.
        
        Args:
            message: User's message
            session_id: Session identifier
            user_id: Optional user ID
            context: Optional context (current product, etc.)
            system_prompt: Dynamic system prompt from database
        
        Returns:
            Dict with 'message' and optional 'metadata'
        """
        # Initialize session if needed
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        
        # Add user message to history
        self.sessions[session_id].append({
            "role": "user",
            "content": message,
        })
        
        # If no OpenAI key, return demo response
        if not self.client:
            demo_response = self._get_demo_response(message)
            self.sessions[session_id].append({
                "role": "assistant",
                "content": demo_response,
            })
            return {
                "message": demo_response,
                "metadata": {"demo_mode": True},
            }
        
        try:
            # Use provided prompt or default
            prompt = system_prompt or self.default_system_prompt
            
            # Build context-aware prompt
            if context:
                context_info = self._format_context(context)
                prompt += f"\n\nCurrent context:\n{context_info}"
            
            # Build messages for OpenAI
            messages = [{"role": "system", "content": prompt}]
            
            # Add conversation history (last 10 messages)
            messages.extend(self.sessions[session_id][-10:])
            
            # Call OpenAI
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=500,
                temperature=0.7,
            )
            
            ai_message = completion.choices[0].message.content
            
            # Add to session history
            self.sessions[session_id].append({
                "role": "assistant",
                "content": ai_message,
            })
            
            return {
                "message": ai_message,
                "metadata": {
                    "tokens_used": completion.usage.total_tokens if completion.usage else None,
                    "model": self.model,
                },
            }
            
        except Exception as e:
            error_message = "I apologize, but I'm having trouble connecting right now. Please try again in a moment."
            return {
                "message": error_message,
                "metadata": {"error": str(e)},
            }
    
    async def get_session_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get conversation history for a session"""
        return self.sessions.get(session_id, [])
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context dictionary into readable string"""
        lines = []
        if "product" in context:
            product = context["product"]
            lines.append(f"Customer is viewing: {product.get('name', 'Unknown')}")
            lines.append(f"Brand: {product.get('brand', 'Unknown')}")
            lines.append(f"Price: ${product.get('price', 'N/A')}")
        if "category" in context:
            lines.append(f"Browsing category: {context['category']}")
        return "\n".join(lines)
    
    def _get_demo_response(self, message: str) -> str:
        """Generate demo response when no API key is configured"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["hello", "hi", "hey", "chào"]):
            return "Welcome to AURA ARCHIVE! I'm AURA, your personal stylist. How may I assist you in finding the perfect luxury piece today?"
        
        if any(word in message_lower for word in ["bag", "bags", "handbag", "túi"]):
            return "I'd love to help you find the perfect bag! Are you looking for something for everyday use, or perhaps a statement piece for special occasions? We have exquisite options from Chanel, Hermès, and Louis Vuitton."
        
        if any(word in message_lower for word in ["dress", "clothing", "wear", "áo", "quần"]):
            return "Wonderful! We have a stunning collection of designer clothing. Could you tell me more about the occasion you're shopping for? This will help me curate the most suitable options for you."
        
        if any(word in message_lower for word in ["shoe", "shoes", "boot", "sneaker", "giày"]):
            return "Great choice! Footwear can make or break an outfit. Are you interested in casual sneakers like Rick Owens Geobaskets, or perhaps something more formal? What's your preferred style?"
        
        if any(word in message_lower for word in ["consign", "sell", "bán"]):
            return "We'd be delighted to discuss consignment! AURA ARCHIVE offers competitive rates for authenticated luxury pieces. Would you like me to explain our consignment process?"
        
        if any(word in message_lower for word in ["price", "budget", "giá"]):
            return "I understand budget is important. Could you share your price range? We have beautiful pieces starting from $200 up to investment-worthy collector's items."
        
        return "That's a great question! As your personal stylist, I'm here to help you navigate our curated collection of luxury fashion. What style or brand are you most interested in?"
