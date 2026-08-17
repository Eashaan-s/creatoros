from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GenerationRun, UserSettings
from app.schemas import WriterGenerateRequest, WriterImproveRequest
from app.services.ai.service import AIService
from app.services.ai.types import GenerationRequest, StreamChunk

LENGTH_GUIDE = {
    "short": "Keep it concise (roughly 300-500 words).",
    "medium": "Aim for a solid mid-length piece (roughly 700-1200 words).",
    "long": "Write a thorough long-form piece (roughly 1500-2500 words).",
}

TYPE_LABELS = {
    "blog": "blog post",
    "newsletter": "newsletter edition",
    "tech_docs": "technical documentation page",
    "email": "professional email",
    "cold_email": "cold outreach email",
    "sales_copy": "sales copy",
    "landing_page": "landing page copy",
    "product_description": "product description",
    "press_release": "press release",
    "whitepaper": "whitepaper section",
}


def build_writer_prompt(payload: WriterGenerateRequest) -> tuple[str, str]:
    system = (
        "You are CreatorOS Writer Studio, a premium writing co-pilot for creators. "
        "Produce polished Markdown suitable for a professional productivity suite. "
        "Avoid chatbot fluff. Use clear headings, short paragraphs, and scannable structure."
    )
    keywords = ", ".join(payload.keywords) if payload.keywords else "(none)"
    prompt = (
        f"Write a {TYPE_LABELS.get(payload.type, payload.type)}.\n\n"
        f"Topic: {payload.topic}\n"
        f"Audience: {payload.audience or 'general professional audience'}\n"
        f"Tone: {payload.tone}\n"
        f"Length: {LENGTH_GUIDE.get(payload.length, payload.length)}\n"
        f"Keywords to weave in naturally: {keywords}\n"
        f"Call to action: {payload.cta or '(optional — omit if empty)'}\n\n"
        f"Return Markdown only."
    )
    return system, prompt


class WriterService:
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
            module="writer",
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
        payload: WriterGenerateRequest,
        settings: UserSettings | None,
    ) -> tuple[str, GenerationRun]:
        system, prompt = build_writer_prompt(payload)
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
            GenerationRequest(system=system, prompt=prompt, **opts, metadata={"module": "writer"})
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
        payload: WriterGenerateRequest,
        settings: UserSettings | None,
    ) -> AsyncIterator[tuple[StreamChunk, GenerationRun | None]]:
        system, prompt = build_writer_prompt(payload)
        opts = self._provider_opts(settings)
        run = await self._create_run(
            db,
            user_id=user_id,
            document_id=payload.document_id,
            provider=str(opts.get("provider") or self.ai.settings.ai_provider),
            model=str(opts.get("model") or self.ai.settings.ai_model),
            input_data=payload.model_dump(),
        )
        # Persist run before streaming so clients can reference run_id
        await db.commit()

        tokens_out_est = 0
        try:
            async for chunk in self.ai.stream(
                GenerationRequest(system=system, prompt=prompt, **opts, metadata={"module": "writer"})
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
        payload: WriterImproveRequest,
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
