"""
Chat Router
AURA ARCHIVE - Chat API endpoints with dynamic system prompt
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import uuid4

from app.services.stylist_engine import StylistEngine

router = APIRouter()
stylist = StylistEngine()


class ChatRequest(BaseModel):
    """Chat request from Node.js server"""
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    system_prompt: Optional[str] = None  # Dynamic prompt from Node.js


class ChatResponse(BaseModel):
    """Chat response to client"""
    success: bool = True
    message: str
    session_id: str
    metadata: Optional[Dict[str, Any]] = None


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat message with dynamic system prompt.
    
    The system_prompt is sent from Node.js server (fetched from database).
    This allows admin to change AI behavior without redeploying.
    """
    try:
        session_id = request.session_id or str(uuid4())
        
        response = await stylist.process_message(
            message=request.message,
            session_id=session_id,
            user_id=request.user_id,
            context=request.context,
            system_prompt=request.system_prompt,
        )
        
        return ChatResponse(
            success=True,
            message=response["message"],
            session_id=session_id,
            metadata=response.get("metadata"),
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat: {str(e)}"
        )


@router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session."""
    try:
        history = await stylist.get_session_history(session_id)
        return {
            "success": True,
            "session_id": session_id,
            "messages": history,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get chat history: {str(e)}"
        )
