from __future__ import annotations

from typing import Any

from app.core.config import Settings
from app.services.ai.providers.mock import MockProvider
from app.services.ai.providers.openrouter import OpenRouterAdapter
from app.services.ai.providers.stubs import (
    AnthropicAdapter,
    AzureOpenAIAdapter,
    GeminiAdapter,
    GroqAdapter,
    OllamaAdapter,
    OpenAIAdapter,
)
from app.services.ai.types import AIProvider


class ProviderRegistry:
    """Resolves AI providers by name. Modules never instantiate vendors directly."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._providers: dict[str, AIProvider] = {}
        self._register_defaults()

    def _register_defaults(self) -> None:
        self.register(MockProvider())
        self.register(
            OpenRouterAdapter(
                api_key=self.settings.ai_api_key,
                base_url=self.settings.ai_base_url,
                default_model=self.settings.ai_model,
            )
        )
        # Extensibility stubs
        self.register(OpenAIAdapter())
        self.register(AnthropicAdapter())
        self.register(GeminiAdapter())
        self.register(GroqAdapter())
        self.register(OllamaAdapter())
        self.register(AzureOpenAIAdapter())

    def register(self, provider: AIProvider) -> None:
        self._providers[provider.name] = provider

    def get(self, name: str | None = None) -> AIProvider:
        key = (name or self.settings.ai_provider or "mock").lower()
        provider = self._providers.get(key)
        if provider is None:
            raise KeyError(f"Unknown AI provider: {key}")
        return provider

    def list_names(self) -> list[str]:
        return sorted(self._providers.keys())

    def describe(self) -> list[dict[str, Any]]:
        return [{"name": name, "ready": name in {"mock", "openrouter"}} for name in self.list_names()]
