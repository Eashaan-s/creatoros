from __future__ import annotations

import math
import uuid
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import GenerationRun, UserSettings
from app.schemas import AcademicGenerateRequest, AcademicImproveRequest, AcademicPaperOut
from app.services.ai.service import AIService
from app.services.ai.types import GenerationRequest, StreamChunk

PAGE_WORDS: dict[int, int] = {
    1: 700,
    2: 1100,
    3: 1600,
    4: 2200,
    5: 2800,
}


def resolve_target_words(
    *,
    pages: int = 3,
    target_words: int | None = None,
) -> tuple[int, int]:
    """Return (target_words, pages) with custom words overriding page estimate."""
    page = pages if pages in PAGE_WORDS else 3
    if target_words is not None:
        words = max(600, min(5000, int(target_words)))
        # Nearest page label for prompt wording
        nearest = min(PAGE_WORDS.keys(), key=lambda p: abs(PAGE_WORDS[p] - words))
        return words, nearest
    return PAGE_WORDS[page], page


def resolve_max_tokens(settings: UserSettings | None, target_words: int) -> int:
    base = settings.max_tokens if settings is not None else 2048
    needed = int(math.ceil(target_words * 1.6) + 800)
    return min(16000, max(base, needed, 3000))


def _detail_guidance(detail: str) -> str:
    if detail == "overview":
        return (
            "DETAIL LEVEL: Overview — keep sections concise. "
            "Related Work: 2–3 tight paragraphs. Methodology: high-level design only. "
            "Results: brief expected evaluation; avoid long digressions."
        )
    if detail == "exhaustive":
        return (
            "DETAIL LEVEL: Exhaustive — expand Methodology, Results and Discussion, and Related Work. "
            "Use multiple subsections where helpful. Cite sources densely with [n]. "
            "Discuss limitations, threats to validity, and future work thoroughly. "
            "Do not pad with filler; add substantive analysis."
        )
    return (
        "DETAIL LEVEL: Thorough — balanced IEEE draft depth across all sections. "
        "Related Work and Methodology should be solid paragraphs with citations."
    )


def _format_paper(idx: int, paper: AcademicPaperOut) -> str:
    authors = ", ".join(paper.authors) if paper.authors else "Unknown"
    year = paper.year or "n.d."
    venue = paper.venue or "Unknown venue"
    doi = f" DOI: {paper.doi}." if paper.doi else ""
    url = f" URL: {paper.url}." if paper.url else ""
    abstract = paper.abstract.strip() or "(No abstract available)"
    return (
        f"[{idx}] {authors}. \"{paper.title}.\" {venue}, {year}.{doi}{url}\n"
        f"Abstract: {abstract}"
    )


def build_academic_prompt(payload: AcademicGenerateRequest) -> tuple[str, str]:
    words, pages = resolve_target_words(pages=payload.pages, target_words=payload.target_words)
    detail = payload.detail or "thorough"

    system = (
        "You are CreatorOS Academic Mode — a coursework research drafting assistant for college students. "
        "Draft an IEEE-style research paper grounded in the provided papers/sources. "
        "This is a LEARNING AID, not a submission-ready publication. "
        "Prefer citing provided sources with IEEE numeric citations [1], [2]. "
        "When evidence is thin, still draft structure but mark uncertain claims clearly "
        "(e.g., '(limited evidence in provided sources)'). "
        "Do not invent DOIs, fake quotes, or fabricated experimental results. "
        "If results are unknown, discuss expected evaluation methodology instead of fake numbers. "
        "Meet the requested word/page target by expanding substance, not filler. "
        "Return Markdown only."
    )

    paper_blocks = [
        _format_paper(i, paper) for i, paper in enumerate(payload.papers, start=1)
    ] or ["(No bibliographic papers selected)"]

    extra_sources: list[str] = []
    # Cap per-source excerpt so 20+ attachments still fit in the prompt budget.
    per_source_chars = 8000 if len(payload.sources or []) <= 8 else 4500
    for i, source in enumerate(payload.sources or [], start=1):
        extra_sources.append(
            f"Extra source {i}: {source.title} [{source.kind}]\n{source.content[:per_source_chars]}"
        )

    field = payload.field.strip() or "general engineering / CS"
    question = payload.research_question.strip() or "(not specified)"

    prompt = (
        f"Topic: {payload.topic}\n"
        f"Field: {field}\n"
        f"Research question: {question}\n"
        f"LENGTH TARGET: approximately {words} words (~{pages} pages). "
        f"Expand sections proportionally to hit this length; do not stop early.\n"
        f"{_detail_guidance(detail)}\n\n"
        "Write a full IEEE-format draft with these exact section headings:\n"
        "## Title\n"
        "## Authors\n"
        "(Use placeholder: Student Author, Department, University)\n"
        "## Abstract\n"
        "## Keywords\n"
        "## I. Introduction\n"
        "## II. Related Work\n"
        "## III. Methodology\n"
        "## IV. Results and Discussion\n"
        "## V. Conclusion\n"
        "## References\n"
        "References must be IEEE-style and numbered to match in-text citations.\n"
        "Include a short final note: 'Learning draft — verify all citations before academic submission.'\n\n"
        "BIBLIOGRAPHIC PAPERS:\n"
        + "\n\n".join(paper_blocks)
        + ("\n\nADDITIONAL SOURCE TEXT:\n" + "\n\n".join(extra_sources) if extra_sources else "")
    )
    return system, prompt


class AcademicService:
    def __init__(self, ai: AIService) -> None:
        self.ai = ai

    def _provider_opts(
        self,
        settings: UserSettings | None,
        *,
        pages: int = 3,
        target_words: int | None = None,
    ) -> dict:
        words, _ = resolve_target_words(pages=pages, target_words=target_words)
        max_tokens = resolve_max_tokens(settings, words)
        if settings is None:
            return {"max_tokens": max_tokens}
        return {
            "provider": settings.ai_provider,
            "model": settings.ai_model,
            "temperature": min(settings.temperature, 0.55),
            "max_tokens": max_tokens,
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

    async def stream(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        payload: AcademicGenerateRequest,
        settings: UserSettings | None,
    ) -> AsyncIterator[tuple[StreamChunk, GenerationRun | None]]:
        if not payload.papers and not payload.sources:
            raise ValueError("Add at least one paper or source before generating an academic draft.")

        words, pages = resolve_target_words(pages=payload.pages, target_words=payload.target_words)
        system, prompt = build_academic_prompt(payload)
        opts = self._provider_opts(
            settings,
            pages=payload.pages,
            target_words=payload.target_words,
        )
        run = await self._create_run(
            db,
            user_id=user_id,
            document_id=payload.document_id,
            provider=str(opts.get("provider") or self.ai.settings.ai_provider),
            model=str(opts.get("model") or self.ai.settings.ai_model),
            input_data={
                "mode": "academic",
                "topic": payload.topic,
                "paper_ids": [p.id for p in payload.papers],
                "pages": pages,
                "detail": payload.detail,
                "target_words": words,
                "max_tokens": opts.get("max_tokens"),
            },
        )
        await db.commit()

        tokens_out_est = 0
        try:
            async for chunk in self.ai.stream(
                GenerationRequest(
                    system=system,
                    prompt=prompt,
                    **opts,
                    metadata={"module": "research", "mode": "academic"},
                )
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
        payload: AcademicImproveRequest,
        settings: UserSettings | None,
    ) -> tuple[str, GenerationRun]:
        pages = payload.pages or 3
        detail = payload.detail or "thorough"
        words, resolved_pages = resolve_target_words(pages=pages, target_words=payload.target_words)
        opts = self._provider_opts(settings, pages=pages, target_words=payload.target_words)

        length_note = (
            f" Expand toward approximately {words} words (~{resolved_pages} pages) "
            f"at {detail} detail if the draft is shorter than the target. "
            f"{_detail_guidance(detail)}"
        )
        instruction = (payload.instruction or "").strip() + length_note

        run = await self._create_run(
            db,
            user_id=user_id,
            document_id=payload.document_id,
            provider=str(opts.get("provider") or self.ai.settings.ai_provider),
            model=str(opts.get("model") or self.ai.settings.ai_model),
            input_data={
                "mode": "academic_improve",
                "pages": resolved_pages,
                "detail": detail,
                "target_words": words,
                "instruction": instruction,
            },
        )
        result = await self.ai.rewrite(
            payload.content,
            instruction,
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
