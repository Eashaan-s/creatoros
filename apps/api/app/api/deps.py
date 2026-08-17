from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthUser, get_auth_user
from app.db.models import User
from app.db.session import get_db
from app.modules.users.service import get_or_create_user
from app.services.ai.service import AIService, get_ai_service
from fastapi import Depends


async def get_current_user(
    auth: AuthUser = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await get_or_create_user(db, auth)


def get_ai() -> AIService:
    return get_ai_service()
