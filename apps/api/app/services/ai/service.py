from __future__ import annotations

from collections.abc import AsyncIterator

from app.core.config import Settings, get_settings
from app.services.ai.registry import ProviderRegistry
from app.services.ai.types import (
    ChatMessage,
    CompletionRequest,
    GenerationRequest,
    GenerationResult,
    StreamChunk,
)


class AIService:
    """
    Single AI entry point for all CreatorOS modules.
    Never call vendor SDKs from modules — always go through AIService.
    """

    def __init__(self, settings: Settings | None = None, registry: ProviderRegistry | None = None) -> None:
        self.settings = settings or get_settings()
        self.registry = registry or ProviderRegistry(self.settings)

    def _completion_request(self, req: GenerationRequest) -> CompletionRequest:
        messages: list[ChatMessage] = []
        if req.system:
            messages.append(ChatMessage(role="system", content=req.system))
        messages.append(ChatMessage(role="user", content=req.prompt))
        return CompletionRequest(
            messages=messages,
            model=req.model or self.settings.ai_model,
            temperature=req.temperature if req.temperature is not None else self.settings.ai_temperature,
            max_tokens=req.max_tokens if req.max_tokens is not None else self.settings.ai_max_tokens,
            metadata=req.metadata,
        )

    async def generate(self, req: GenerationRequest) -> GenerationResult:
        provider = self.registry.get(req.provider)
        result = await provider.complete(self._completion_request(req))
        return GenerationResult(
            text=result.text,
            provider=result.provider,
            model=result.model,
            tokens_in=result.tokens_in,
            tokens_out=result.tokens_out,
        )

    async def stream(self, req: GenerationRequest) -> AsyncIterator[StreamChunk]:
        provider = self.registry.get(req.provider)
        model = req.model or self.settings.ai_model
        async for token in provider.stream(self._completion_request(req)):
            yield StreamChunk(text=token, done=False, provider=provider.name, model=model)
        yield StreamChunk(text="", done=True, provider=provider.name, model=model)

    async def rewrite(
        self,
        text: str,
        instruction: str = "Improve clarity and flow while preserving meaning.",
        *,
        provider: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> GenerationResult:
        return await self.generate(
            GenerationRequest(
                system="You are an expert editor inside CreatorOS. Return only the rewritten content.",
                prompt=f"Instruction: {instruction}\n\nText:\n{text}",
                provider=provider,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        )

    async def summarize(
        self,
        content: str,
        *,
        provider: str | None = None,
        model: str | None = None,
    ) -> GenerationResult:
        return await self.generate(
            GenerationRequest(
                system="Summarize clearly with headings and bullet points when helpful.",
                prompt=content,
                provider=provider,
                model=model,
            )
        )

    async def research(
        self,
        query: str,
        sources: list[str] | None = None,
        *,
        provider: str | None = None,
    ) -> GenerationResult:
        # Phase 1 stub — full Research Studio lands later
        source_blob = "\n".join(sources or [])
        return await self.generate(
            GenerationRequest(
                system="You are CreatorOS Research Studio. Provide grounded insights.",
                prompt=f"Query: {query}\n\nSources:\n{source_blob or '(none provided)'}",
                provider=provider,
            )
        )

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        provider: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> GenerationResult:
        p = self.registry.get(provider)
        result = await p.complete(
            CompletionRequest(
                messages=messages,
                model=model or self.settings.ai_model,
                temperature=temperature if temperature is not None else self.settings.ai_temperature,
                max_tokens=max_tokens if max_tokens is not None else self.settings.ai_max_tokens,
            )
        )
        return GenerationResult(
            text=result.text,
            provider=result.provider,
            model=result.model,
            tokens_in=result.tokens_in,
            tokens_out=result.tokens_out,
        )


_ai_service: AIService | None = None


def get_ai_service() -> AIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
