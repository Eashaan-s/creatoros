from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol


Role = Literal["system", "user", "assistant"]


@dataclass
class ChatMessage:
    role: Role
    content: str


@dataclass
class CompletionRequest:
    messages: list[ChatMessage]
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CompletionResult:
    text: str
    provider: str
    model: str
    tokens_in: int = 0
    tokens_out: int = 0
    raw: dict[str, Any] | None = None


@dataclass
class GenerationRequest:
    prompt: str
    system: str | None = None
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    provider: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class GenerationResult:
    text: str
    provider: str
    model: str
    tokens_in: int = 0
    tokens_out: int = 0


@dataclass
class StreamChunk:
    text: str
    done: bool = False
    provider: str | None = None
    model: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0


class AIProvider(Protocol):
    name: str

    async def complete(self, req: CompletionRequest) -> CompletionResult: ...

    def stream(self, req: CompletionRequest) -> AsyncIterator[str]: ...
