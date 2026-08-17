from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GenerationRun, UserSettings
from app.schemas import SocialGenerateRequest, SocialImproveRequest
from app.services.ai.service import AIService
from app.services.ai.types import GenerationRequest, StreamChunk

PLATFORM_GUIDES = {
    "linkedin": (
        "LinkedIn post: professional, first-person or brand voice, short paragraphs, "
        "hook in line 1, optional emoji sparingly, end with a question or CTA. 150–300 words."
    ),
    "twitter": (
        "Twitter/X thread: 5–8 tweets, number each (1/, 2/, …), punchy lines under 280 chars each, "
        "strong hook in tweet 1, clear through-line."
    ),
    "instagram": (
        "Instagram caption: scroll-stopping first line, line breaks for readability, "
        "light emoji, end with CTA + 5–10 relevant hashtags."
    ),
    "facebook": (
        "Facebook post: conversational, community-friendly, 100–200 words, "
        "invite comments, avoid hashtag spam."
    ),
    "reddit": (
        "Reddit post: authentic, non-salesy, helpful tone; include a clear title line then body; "
        "no corporate fluff."
    ),
    "medium": (
        "Medium article intro + outline: engaging headline, dek, then 600–900 words with H2s, "
        "story-driven and thoughtful."
    ),
    "devto": (
        "Dev.to post: practical developer angle, clear headline, code-friendly explanations, "
        "bullet takeaways, friendly technical tone."
    ),
    "threads": (
        "Threads post: concise, conversational, 1–3 short paragraphs, native social cadence, "
        "optional soft CTA."
    ),
}

PLATFORM_HEADINGS = {
    "linkedin": "LinkedIn",
    "twitter": "Twitter / X Thread",
    "instagram": "Instagram",
    "facebook": "Facebook",
    "reddit": "Reddit",
    "medium": "Medium",
    "devto": "Dev.to",
    "threads": "Threads",
}


def build_social_prompt(payload: SocialGenerateRequest) -> tuple[str, str]:
    system = (
        "You are CreatorOS Social Studio. Produce platform-native copy for creators. "
        "Never write like a chatbot. Preserve each platform's style strictly. "
        "Return Markdown only."
    )
    sections = []
    for platform in payload.platforms:
        sections.append(
            f"### {PLATFORM_HEADINGS.get(platform, platform)}\n"
            f"Style rules: {PLATFORM_GUIDES.get(platform, platform)}"
        )
    prompt = (
        f"Core idea: {payload.idea}\n"
        f"Audience: {payload.audience or 'general social audience'}\n"
        f"Tone: {payload.tone}\n\n"
        f"Generate distinct copy for EACH platform below.\n"
        f"Use exactly these Markdown headings (## PlatformName) as section titles:\n"
        + "\n".join(f"- ## {PLATFORM_HEADINGS[p]}" for p in payload.platforms)
        + "\n\n"
        + "\n\n".join(sections)
        + "\n\nDo not merge platforms. Keep each section ready to copy-paste."
    )
    return system, prompt


class SocialService:
    def __init__(self, ai: AIService) -> None:
        self.ai = ai

    def _provider_opts(self, settings: UserSettings | None) -> dict:
        if settings is None:
            return {}
        return {
            "provider": settings.ai_provider,
            "model": settings.ai_model,
            "temperature": settings.temperature,
            "max_tokens": settings.max_tokens,
        }

    async def _create_run(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        document_id: str | None,
        provider: str,
        model: str,
        input_data: dict,
        status: str = "running",
    ) -> GenerationRun:
        run = GenerationRun(
            id=str(uuid.uuid4()),
            user_id=user_id,
            document_id=document_id,
            module="social",
            provider=provider,
            model=model,
            input=input_data,
            status=status,
        )
        db.add(run)
        await db.flush()
        return run

    async def generate(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        payload: SocialGenerateRequest,
        settings: UserSettings | None,
    ) -> tuple[str, GenerationRun]:
        system, prompt = build_social_prompt(payload)
        opts = self._provider_opts(settings)
        run = await self._create_run(
            db,
            user_id=user_id,
            document_id=payload.document_id,
            provider=str(opts.get("provider") or self.ai.settings.ai_provider),
            model=str(opts.get("model") or self.ai.settings.ai_model),
            input_data=payload.model_dump(),
        )
        result = await self.ai.generate(
            GenerationRequest(system=system, prompt=prompt, **opts, metadata={"module": "social"})
        )
        run.status = "completed"
        run.tokens_in = result.tokens_in
        run.tokens_out = result.tokens_out
        run.provider = result.provider
        run.model = result.model
        await db.flush()
        return result.text, run

    async def stream(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        payload: SocialGenerateRequest,
        settings: UserSettings | None,
    ) -> AsyncIterator[tuple[StreamChunk, GenerationRun | None]]:
        system, prompt = build_social_prompt(payload)
        opts = self._provider_opts(settings)
        run = await self._create_run(
            db,
            user_id=user_id,
            document_id=payload.document_id,
            provider=str(opts.get("provider") or self.ai.settings.ai_provider),
            model=str(opts.get("model") or self.ai.settings.ai_model),
            input_data=payload.model_dump(),
        )
        await db.commit()

        tokens_out_est = 0
        try:
            async for chunk in self.ai.stream(
                GenerationRequest(system=system, prompt=prompt, **opts, metadata={"module": "social"})
            ):
                tokens_out_est += max(1, len(chunk.text) // 4) if chunk.text else 0
                if chunk.done:
                    run.status = "completed"
                    run.tokens_out = tokens_out_est
                    if chunk.provider:
                        run.provider = chunk.provider
                    if chunk.model:
                        run.model = chunk.model
                    await db.commit()
                    yield chunk, run
                else:
                    yield chunk, None
        except Exception:
            run.status = "failed"
            await db.commit()
            raise

    async def improve(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        payload: SocialImproveRequest,
        settings: UserSettings | None,
    ) -> tuple[str, GenerationRun]:
        opts = self._provider_opts(settings)
        run = await self._create_run(
            db,
            user_id=user_id,
            document_id=payload.document_id,
            provider=str(opts.get("provider") or self.ai.settings.ai_provider),
            model=str(opts.get("model") or self.ai.settings.ai_model),
            input_data=payload.model_dump(),
        )
        result = await self.ai.rewrite(
            payload.content,
            payload.instruction,
            provider=opts.get("provider"),
            model=opts.get("model"),
            temperature=opts.get("temperature"),
            max_tokens=opts.get("max_tokens"),
        )
        run.status = "completed"
        run.tokens_in = result.tokens_in
        run.tokens_out = result.tokens_out
        run.provider = result.provider
        run.model = result.model
        await db.flush()
        return result.text, run
