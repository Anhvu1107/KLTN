"""
AURA ARCHIVE - AI Stylist Service
FastAPI application with OpenAI integration
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import chat
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print(f"""
========================================
  AURA ARCHIVE AI Service Started
========================================
  Environment: {settings.ENVIRONMENT}
  Port: 8000
  Docs: http://localhost:8000/docs
========================================
    """)
    yield
    # Shutdown
    print("AI Service shutting down...")


app = FastAPI(
    title="AURA ARCHIVE AI Stylist",
    description="AI-powered fashion styling assistant for luxury consignment",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Nuxt dev
        "http://localhost:5000",  # Express server
        settings.BACKEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "success": True,
        "message": "AURA ARCHIVE AI Stylist Service",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "status": "healthy",
        "service": "ai_stylist",
    }
