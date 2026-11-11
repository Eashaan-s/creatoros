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
_jwks_client_url: str | None = None


@dataclass
class AuthUser:
    clerk_user_id: str
    email: str
    name: str | None = None
    avatar_url: str | None = None
    claims: dict[str, Any] | None = None


def _normalize_clerk_issuer(raw: str) -> str:
    value = (raw or "").strip().rstrip("/")
    # Common misconfig: pasting the JWKS URL into CLERK_ISSUER
    marker = "/.well-known/jwks.json"
    if marker in value:
        value = value.split(marker, 1)[0].rstrip("/")
    return value


def _normalize_clerk_jwks_url(raw: str, issuer: str = "") -> str:
    value = (raw or "").strip()
    if not value and issuer:
        return f"{_normalize_clerk_issuer(issuer)}/.well-known/jwks.json"
    if value and "/.well-known/" not in value:
        host = _normalize_clerk_issuer(value)
        if host.startswith("http"):
            return f"{host}/.well-known/jwks.json"
    return value


def _get_jwks_client(settings: Settings) -> PyJWKClient:
    global _jwks_client, _jwks_client_url
    jwks_url = _normalize_clerk_jwks_url(settings.clerk_jwks_url, settings.clerk_issuer)
    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CLERK_JWKS_URL is not configured",
        )
    if _jwks_client is None or _jwks_client_url != jwks_url:
        # Long lifespan avoids re-fetching Clerk JWKS on every local request burst.
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
        _jwks_client_url = jwks_url
    return _jwks_client


def _decode_clerk_token(token: str, settings: Settings) -> dict[str, Any]:
    client = _get_jwks_client(settings)
    signing_key = client.get_signing_key_from_jwt(token)
    issuer = _normalize_clerk_issuer(settings.clerk_issuer)
    audience = (settings.clerk_audience or "").strip()
    options = {
        "verify_aud": bool(audience),
        "verify_iss": bool(issuer),
    }
    decode_kwargs: dict[str, Any] = {
        "algorithms": ["RS256"],
        "options": options,
        "leeway": 60,
    }
    if issuer:
        decode_kwargs["issuer"] = issuer
    if audience:
        decode_kwargs["audience"] = audience
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
                detail=f"Invalid authentication token ({exc})",
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
