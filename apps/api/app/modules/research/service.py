from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GenerationRun, UserSettings
from app.schemas import ResearchGenerateRequest, ResearchImproveRequest, ResearchOutputType
from app.services.ai.service import AIService
from app.services.ai.types import GenerationRequest, StreamChunk

OUTPUT_GUIDES: dict[ResearchOutputType, str] = {
    "summary": "Write a clear executive summary with short paragraphs and optional bullets.",
    "key_insights": "List the most important insights as crisp bullets with brief explanations.",
    "mindmap": (
        "Produce a hierarchical mindmap in Markdown nested lists. "
        "Start from a root topic, then branches and sub-branches."
    ),
    "faqs": "Create 6–10 FAQs grounded in the sources. Bold the questions.",
    "flashcards": (
        "Create 8–12 flashcards as Markdown:\n"
        "- **Q:** ...\n- **A:** ..."
    ),
    "citations": (
        "Produce citation-style notes: claim + supporting snippet reference "
        "(use source titles). Be conservative — only cite what is supported."
    ),
    "questions": "Generate thoughtful discussion / study questions grouped by theme.",
}

OUTPUT_HEADINGS: dict[ResearchOutputType, str] = {
    "summary": "Summary",
    "key_insights": "Key Insights",
    "mindmap": "Mindmap",
    "faqs": "FAQs",
    "flashcards": "Flashcards",
    "citations": "Citations",
    "questions": "Questions",
}


def build_research_prompt(payload: ResearchGenerateRequest) -> tuple[str, str]:
    system = (
        "You are CreatorOS Research Studio — a precise research co-pilot. "
        "Ground every output in the provided sources. Do not invent facts. "
        "Return Markdown only. Use clear ## section headings."
    )

    source_blocks: list[str] = []
    for idx, source in enumerate(payload.sources, start=1):
        origin = f" ({source.origin})" if source.origin else ""
        source_blocks.append(
            f"### Source {idx}: {source.title} [{source.kind}]{origin}\n{source.content}"
        )

    output_blocks = []
    for output in payload.outputs:
        output_blocks.append(
            f"- ## {OUTPUT_HEADINGS[output]}\n  Guidance: {OUTPUT_GUIDES[output]}"
        )

    focus = payload.focus.strip() or "Cover the material comprehensively."
    prompt = (
        f"Research focus: {focus}\n\n"
        f"Generate ONLY these sections (use exact ## headings):\n"
        + "\n".join(output_blocks)
        + "\n\nSOURCES:\n"
        + "\n\n".join(source_blocks)
    )
    return system, prompt


class ResearchService:
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
    ) -> GenerationRun:
        run = GenerationRun(
            id=str(uuid.uuid4()),
            user_id=user_id,
            document_id=document_id,
            module="research",
            provider=provider,
            model=model,
            input=input_data,
            status="running",
        )
        db.add(run)
        await db.flush()
        return run

    async def generate(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        payload: ResearchGenerateRequest,
        settings: UserSettings | None,
    ) -> tuple[str, GenerationRun]:
        system, prompt = build_research_prompt(payload)
        opts = self._provider_opts(settings)
        run = await self._create_run(
            db,
            user_id=user_id,
            document_id=payload.document_id,
            provider=str(opts.get("provider") or self.ai.settings.ai_provider),
            model=str(opts.get("model") or self.ai.settings.ai_model),
            input_data={
                "outputs": payload.outputs,
                "focus": payload.focus,
                "source_titles": [s.title for s in payload.sources],
            },
        )
        result = await self.ai.generate(
            GenerationRequest(system=system, prompt=prompt, **opts, metadata={"module": "research"})
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
        payload: ResearchGenerateRequest,
        settings: UserSettings | None,
    ) -> AsyncIterator[tuple[StreamChunk, GenerationRun | None]]:
        system, prompt = build_research_prompt(payload)
        opts = self._provider_opts(settings)
        run = await self._create_run(
            db,
            user_id=user_id,
            document_id=payload.document_id,
            provider=str(opts.get("provider") or self.ai.settings.ai_provider),
            model=str(opts.get("model") or self.ai.settings.ai_model),
            input_data={
                "outputs": payload.outputs,
                "focus": payload.focus,
                "source_titles": [s.title for s in payload.sources],
            },
        )
        await db.commit()

        tokens_out_est = 0
        try:
            async for chunk in self.ai.stream(
                GenerationRequest(system=system, prompt=prompt, **opts, metadata={"module": "research"})
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
        payload: ResearchImproveRequest,
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
