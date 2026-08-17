from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.services.ai.types import CompletionRequest, CompletionResult


class OpenRouterAdapter:
    """
    OpenAI-compatible chat completions via OpenRouter.
    Also works against any OpenAI-compatible base URL by changing AI_BASE_URL.
    """

    name = "openrouter"

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://openrouter.ai/api/v1",
        default_model: str = "openai/gpt-4o-mini",
        site_url: str = "http://localhost:3000",
        app_name: str = "CreatorOS",
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.site_url = site_url
        self.app_name = app_name

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.app_name,
        }

    def _payload(self, req: CompletionRequest, stream: bool) -> dict[str, Any]:
        return {
            "model": req.model or self.default_model,
            "messages": [{"role": m.role, "content": m.content} for m in req.messages],
            "temperature": req.temperature if req.temperature is not None else 0.7,
            "max_tokens": req.max_tokens if req.max_tokens is not None else 2048,
            "stream": stream,
        }

    async def complete(self, req: CompletionRequest) -> CompletionResult:
        if not self.api_key:
            raise RuntimeError("AI_API_KEY is required for OpenRouterAdapter")

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=self._payload(req, stream=False),
            )
            response.raise_for_status()
            data = response.json()

        choice = data["choices"][0]["message"]["content"]
        usage = data.get("usage") or {}
        return CompletionResult(
            text=choice or "",
            provider=self.name,
            model=data.get("model") or req.model or self.default_model,
            tokens_in=int(usage.get("prompt_tokens") or 0),
            tokens_out=int(usage.get("completion_tokens") or 0),
            raw=data,
        )

    async def stream(self, req: CompletionRequest) -> AsyncIterator[str]:
        if not self.api_key:
            raise RuntimeError("AI_API_KEY is required for OpenRouterAdapter")

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=self._payload(req, stream=True),
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        payload = line[6:].strip()
                        if payload == "[DONE]":
                            break
                        try:
                            data = json.loads(payload)
                        except json.JSONDecodeError:
                            continue
                        delta = data.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content")
                        if content:
                            yield content
