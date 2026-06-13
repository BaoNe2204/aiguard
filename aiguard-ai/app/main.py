import uvicorn
from fastapi import FastAPI

from app.core.config import settings
from app.api.api import api_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Dịch vụ phân tích an toàn, phát hiện dữ liệu nhạy cảm PII và Prompt Injection",
    version=settings.APP_VERSION
)

# Include main router
app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
