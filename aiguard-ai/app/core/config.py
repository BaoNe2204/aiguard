from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "AIGuard Control Tower - AI Security Microservice"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    # Model configs
    LLAMA_GUARD_MODEL_ID: str = "meta-llama/Llama-Guard-3-8B"
    
    class Config:
        env_file = ".env"

settings = Settings()
