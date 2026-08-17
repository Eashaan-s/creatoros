from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UserSettings
from app.schemas import UserSettingsUpdate


async def get_settings_for_user(db: AsyncSession, user_id: str) -> UserSettings:
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    settings = result.scalar_one_or_none()
    if settings is None:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        await db.flush()
        await db.refresh(settings)
    return settings


async def update_settings(
    db: AsyncSession, user_id: str, payload: UserSettingsUpdate
) -> UserSettings:
    settings = await get_settings_for_user(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(settings, key, value)
    await db.flush()
    await db.refresh(settings)
    return settings
