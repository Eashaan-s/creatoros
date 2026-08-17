from fastapi import APIRouter

from app.api.v1 import documents, me, research, settings, social, writer

api_router = APIRouter()
api_router.include_router(me.router)
api_router.include_router(settings.router)
api_router.include_router(documents.router)
api_router.include_router(writer.router)
api_router.include_router(social.router)
api_router.include_router(research.router)
