from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from app.services.ai.types import CompletionRequest, CompletionResult


class MockProvider:
    """Deterministic local provider for development without API keys."""

    name = "mock"

    async def complete(self, req: CompletionRequest) -> CompletionResult:
        text = self._compose(req)
        return CompletionResult(
            text=text,
            provider=self.name,
            model=req.model or "mock-creatoros",
            tokens_in=max(1, len(str(req.messages)) // 4),
            tokens_out=max(1, len(text) // 4),
        )

    async def stream(self, req: CompletionRequest) -> AsyncIterator[str]:
        text = self._compose(req)
        # Stream word-by-word to exercise SSE clients
        words = text.split(" ")
        for i, word in enumerate(words):
            chunk = word if i == len(words) - 1 else word + " "
            yield chunk
            await asyncio.sleep(0.015)

    def _compose(self, req: CompletionRequest) -> str:
        user_msgs = [m.content for m in req.messages if m.role == "user"]
        prompt = user_msgs[-1] if user_msgs else "Untitled topic"
        return (
            f"# CreatorOS Draft\n\n"
            f"{prompt.strip()}\n\n"
            f"## Overview\n\n"
            f"This is a mock generation from CreatorOS. "
            f"Connect OpenRouter (or another provider) in Settings / environment "
            f"to stream real model output.\n\n"
            f"## Key Points\n\n"
            f"- Clear structure tailored to your brief\n"
            f"- Audience-aware tone and pacing\n"
            f"- Ready to edit in Writer Studio\n\n"
            f"## Next Steps\n\n"
            f"Refine this draft with **Improve**, then save it to History.\n"
        )
