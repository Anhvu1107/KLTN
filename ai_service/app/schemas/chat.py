"""
Chat Schemas
AURA ARCHIVE - Pydantic models for chat API
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str = Field(..., description="Role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat request from client"""
    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")
    user_id: Optional[str] = Field(None, description="User ID if authenticated")
    context: Optional[dict] = Field(None, description="Additional context (e.g., current product)")


class ChatResponse(BaseModel):
    """Chat response to client"""
    success: bool = True
    message: str = Field(..., description="AI response message")
    session_id: str = Field(..., description="Session ID")
    metadata: Optional[dict] = Field(None, description="Additional metadata (e.g., product recommendations)")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ProductRecommendation(BaseModel):
    """Product recommendation from AI"""
    product_id: str
    product_name: str
    brand: str
    reason: str
    confidence: float = Field(..., ge=0, le=1)
