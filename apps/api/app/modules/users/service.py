from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import AuthUser
from app.db.models import User, UserSettings


async def get_or_create_user(db: AsyncSession, auth: AuthUser) -> User:
    result = await db.execute(
        select(User).options(selectinload(User.settings)).where(User.clerk_user_id == auth.clerk_user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            clerk_user_id=auth.clerk_user_id,
            email=auth.email,
            name=auth.name,
            avatar_url=auth.avatar_url,
        )
        db.add(user)
        await db.flush()
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        await db.flush()
        await db.refresh(user, attribute_names=["settings"])
        return user

    changed = False
    if auth.email and user.email != auth.email:
        user.email = auth.email
        changed = True
    if auth.name and user.name != auth.name:
        user.name = auth.name
        changed = True
    if auth.avatar_url and user.avatar_url != auth.avatar_url:
        user.avatar_url = auth.avatar_url
        changed = True
    if user.settings is None:
        db.add(UserSettings(user_id=user.id))
        changed = True
    if changed:
        await db.flush()
        await db.refresh(user, attribute_names=["settings"])
    return user
