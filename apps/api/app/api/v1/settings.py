from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.modules.settings import service as settings_service
from app.schemas import UserSettingsOut, UserSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=UserSettingsOut)
async def get_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserSettingsOut:
    settings = await settings_service.get_settings_for_user(db, user.id)
    return UserSettingsOut.model_validate(settings)


@router.patch("", response_model=UserSettingsOut)
async def patch_settings(
    payload: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserSettingsOut:
    settings = await settings_service.update_settings(db, user.id, payload)
    return UserSettingsOut.model_validate(settings)
