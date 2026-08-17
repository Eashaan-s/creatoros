from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CreatorOS API"
    environment: Literal["development", "production", "test"] = "development"
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000"

    database_url: str = "sqlite+aiosqlite:///./creatoros.db"

    clerk_jwks_url: str = ""
    clerk_issuer: str = ""
    clerk_audience: str = ""
    # When true and JWKS not configured, accept unsigned "dev" tokens for local mock auth
    auth_dev_bypass: bool = True

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    ai_provider: str = "mock"
    ai_api_key: str = ""
    ai_model: str = "openai/gpt-4o-mini"
    ai_base_url: str = "https://openrouter.ai/api/v1"
    ai_temperature: float = 0.7
    ai_max_tokens: int = 2048

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
