from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "AIGuard Control Tower - AI Security Microservice"
    APP_VERSION: str = "1.1.0"
    ENVIRONMENT: str = "development"
    
    # Model configs
    LLAMA_GUARD_MODEL_ID: str = "meta-llama/Llama-Guard-3-8B"
    ENABLE_REAL_LLAMA_GUARD: bool = False
    MAX_TEXT_LENGTH: int = 250_000
    
    class Config:
        env_file = ".env"

settings = Settings()
