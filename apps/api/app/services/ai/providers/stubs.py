"""Provider stubs — implement complete()/stream() when wiring each vendor."""

from __future__ import annotations

from collections.abc import AsyncIterator

from app.services.ai.types import CompletionRequest, CompletionResult


class _StubProvider:
    name = "stub"

    async def complete(self, req: CompletionRequest) -> CompletionResult:
        raise NotImplementedError(f"{self.name} adapter is not implemented yet")

    async def stream(self, req: CompletionRequest) -> AsyncIterator[str]:
        raise NotImplementedError(f"{self.name} adapter is not implemented yet")
        yield  # pragma: no cover


class AnthropicAdapter(_StubProvider):
    name = "anthropic"


class GeminiAdapter(_StubProvider):
    name = "gemini"


class GroqAdapter(_StubProvider):
    name = "groq"


class OllamaAdapter(_StubProvider):
    name = "ollama"


class AzureOpenAIAdapter(_StubProvider):
    name = "azure_openai"


class OpenAIAdapter(_StubProvider):
    """Reserved: prefer OpenRouterAdapter for OpenAI-compatible endpoints."""

    name = "openai"
