"""
Core Configuration
AURA ARCHIVE - AI Service settings with hybrid chatbot support
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Environment
    ENVIRONMENT: str = "development"
    
    # AI API Keys (optional — chatbot works without them)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Chatbot mode: "auto" | "api_only" | "trained_only"
    # auto = use API if key available, fallback to trained
    # api_only = only use API (fail if no key)
    # trained_only = only use trained knowledge base
    CHATBOT_MODE: str = "auto"
    
    # Backend API (for product search)
    BACKEND_URL: str = "http://localhost:5000"
    
    # Database (optional for direct access)
    DATABASE_URL: str = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
