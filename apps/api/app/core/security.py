"""Clerk JWT verification with optional local-dev bypass."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)

_jwks_client: PyJWKClient | None = None


@dataclass
class AuthUser:
    clerk_user_id: str
    email: str
    name: str | None = None
    avatar_url: str | None = None
    claims: dict[str, Any] | None = None


def _get_jwks_client(settings: Settings) -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not settings.clerk_jwks_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CLERK_JWKS_URL is not configured",
            )
        _jwks_client = PyJWKClient(settings.clerk_jwks_url)
    return _jwks_client


def _decode_clerk_token(token: str, settings: Settings) -> dict[str, Any]:
    client = _get_jwks_client(settings)
    signing_key = client.get_signing_key_from_jwt(token)
    options = {"verify_aud": bool(settings.clerk_audience)}
    decode_kwargs: dict[str, Any] = {
        "algorithms": ["RS256"],
        "options": options,
    }
    if settings.clerk_issuer:
        decode_kwargs["issuer"] = settings.clerk_issuer
    if settings.clerk_audience:
        decode_kwargs["audience"] = settings.clerk_audience
    return jwt.decode(token, signing_key.key, **decode_kwargs)


def _dev_user_from_token(token: str) -> AuthUser:
    """Allow local development without Clerk by accepting a simple bearer token."""
    if token.startswith("dev:"):
        parts = token.split(":", 2)
        user_id = parts[1] if len(parts) > 1 else "dev_user"
        email = parts[2] if len(parts) > 2 else f"{user_id}@creatoros.local"
        return AuthUser(clerk_user_id=user_id, email=email, name="Dev User")
    return AuthUser(
        clerk_user_id="dev_user",
        email="dev@creatoros.local",
        name="Dev User",
    )


async def get_auth_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthUser:
    if credentials is None or not credentials.credentials:
        # When Clerk JWKS is configured, never silently become the local dev user.
        if settings.clerk_jwks_url:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        if settings.auth_dev_bypass and settings.environment != "production":
            return _dev_user_from_token("dev:dev_user:dev@creatoros.local")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = credentials.credentials

    if settings.clerk_jwks_url:
        try:
            claims = _decode_clerk_token(token, settings)
            email = (
                claims.get("email")
                or claims.get("primary_email_address")
                or f"{claims.get('sub', 'user')}@users.clerk"
            )
            name = claims.get("name") or claims.get("full_name")
            avatar = claims.get("picture") or claims.get("image_url")
            return AuthUser(
                clerk_user_id=str(claims["sub"]),
                email=str(email),
                name=str(name) if name else None,
                avatar_url=str(avatar) if avatar else None,
                claims=claims,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Clerk JWT verification failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            ) from exc

    if settings.auth_dev_bypass and settings.environment != "production":
        return _dev_user_from_token(token)

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Authentication is not configured",
    )


async def fetch_clerk_user_profile(user_id: str, settings: Settings) -> dict[str, Any] | None:
    """Optional enrichment hook for future Clerk Backend API usage."""
    if not settings.supabase_url:
        return None
    return None
