from fastapi import APIRouter
from app.api.routes import scan_api

api_router = APIRouter()

api_router.include_router(scan_api.router, prefix="/ai", tags=["ai"])
