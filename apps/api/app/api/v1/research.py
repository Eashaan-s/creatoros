import json
from collections.abc import AsyncIterator
import asyncio

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_ai, get_current_user
from app.db.models import User
from app.db.session import SessionLocal, get_db
from app.modules.research.academic import AcademicService
from app.modules.research import extract as extract_mod
from app.modules.research.papers import search_papers
from app.modules.research.service import ResearchService
from app.modules.settings import service as settings_service
from app.schemas import (
    AcademicGenerateRequest,
    AcademicImproveRequest,
    AcademicSearchRequest,
    AcademicSearchResponse,
    ResearchExtractResponse,
    ResearchGenerateRequest,
    ResearchGenerateResponse,
    ResearchImproveRequest,
    ResearchPasteExtractRequest,
    ResearchUrlExtractRequest,
    ResearchYoutubeExtractRequest,
)
from app.services.ai.service import AIService

router = APIRouter(prefix="/research", tags=["research"])

# Align with common research PDF limits (e.g. arXiv ~50MB manuscripts).
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_UPLOAD_MB = MAX_UPLOAD_BYTES // (1024 * 1024)
MAX_REFERENCE_FILES = 25


def _research_service(ai: AIService = Depends(get_ai)) -> ResearchService:
    return ResearchService(ai)


def _academic_service(ai: AIService = Depends(get_ai)) -> AcademicService:
    return AcademicService(ai)


@router.post("/extract/file", response_model=ResearchExtractResponse)
async def extract_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> ResearchExtractResponse:
    _ = user
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large (max {MAX_UPLOAD_MB}MB per file)",
        )
    filename = file.filename or "upload.txt"
    try:
        # CPU-bound parse off the event loop so parallel uploads don't stall.
        kind, content = await asyncio.to_thread(extract_mod.extract_file, filename, raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        # Never leak a bare 500 to the studio for bad/scanned PDFs.
        raise HTTPException(
            status_code=400,
            detail=f"Could not read this file. Try another PDF/DOCX/TXT, or paste the text. ({exc})",
        ) from exc
    if not content.strip():
        raise HTTPException(
            status_code=400,
            detail="File contained no usable text. Use a text PDF or paste the content.",
        )
    return ResearchExtractResponse(
        kind=kind,
        title=filename,
        content=content,
        origin=filename,
        char_count=len(content),
    )


@router.post("/extract/url", response_model=ResearchExtractResponse)
async def extract_url(
    payload: ResearchUrlExtractRequest,
    user: User = Depends(get_current_user),
) -> ResearchExtractResponse:
    _ = user
    try:
        kind, title, content = await extract_mod.extract_url(payload.url)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ResearchExtractResponse(
        kind=kind,
        title=title,
        content=content,
        origin=payload.url,
        char_count=len(content),
    )


@router.post("/extract/youtube", response_model=ResearchExtractResponse)
async def extract_youtube(
    payload: ResearchYoutubeExtractRequest,
    user: User = Depends(get_current_user),
) -> ResearchExtractResponse:
    _ = user
    try:
        kind, title, content = await extract_mod.extract_youtube(payload.url)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ResearchExtractResponse(
        kind=kind,
        title=title,
        content=content,
        origin=payload.url,
        char_count=len(content),
    )


@router.post("/extract/paste", response_model=ResearchExtractResponse)
async def extract_paste(
    payload: ResearchPasteExtractRequest,
    user: User = Depends(get_current_user),
) -> ResearchExtractResponse:
    _ = user
    content = extract_mod.truncate(payload.content)
    return ResearchExtractResponse(
        kind="paste",
        title=payload.title or "Pasted notes",
        content=content,
        origin="paste",
        char_count=len(content),
    )


@router.post("/generate", response_model=ResearchGenerateResponse)
async def generate_research(
    payload: ResearchGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    research: ResearchService = Depends(_research_service),
) -> ResearchGenerateResponse:
    settings = await settings_service.get_settings_for_user(db, user.id)
    try:
        text, run = await research.generate(db, user_id=user.id, payload=payload, settings=settings)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Generation failed: {exc}") from exc
    return ResearchGenerateResponse(
        text=text,
        provider=run.provider,
        model=run.model,
        run_id=run.id,
        tokens_in=run.tokens_in,
        tokens_out=run.tokens_out,
    )


@router.post("/stream")
async def stream_research(
    payload: ResearchGenerateRequest,
    user: User = Depends(get_current_user),
    research: ResearchService = Depends(_research_service),
) -> StreamingResponse:
    user_id = user.id

    async def event_generator() -> AsyncIterator[str]:
        async with SessionLocal() as db:
            try:
                settings = await settings_service.get_settings_for_user(db, user_id)
                async for chunk, run in research.stream(
                    db, user_id=user_id, payload=payload, settings=settings
                ):
                    if chunk.done and run is not None:
                        data = {
                            "type": "done",
                            "run_id": run.id,
                            "provider": run.provider,
                            "model": run.model,
                        }
                        yield f"data: {json.dumps(data)}\n\n"
                    elif chunk.text:
                        yield f"data: {json.dumps({'type': 'token', 'text': chunk.text})}\n\n"
            except Exception as exc:  # noqa: BLE001
                yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/improve", response_model=ResearchGenerateResponse)
async def improve_research(
    payload: ResearchImproveRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    research: ResearchService = Depends(_research_service),
) -> ResearchGenerateResponse:
    settings = await settings_service.get_settings_for_user(db, user.id)
    try:
        text, run = await research.improve(db, user_id=user.id, payload=payload, settings=settings)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Improve failed: {exc}") from exc
    return ResearchGenerateResponse(
        text=text,
        provider=run.provider,
        model=run.model,
        run_id=run.id,
        tokens_in=run.tokens_in,
        tokens_out=run.tokens_out,
    )


@router.post("/papers/search", response_model=AcademicSearchResponse)
async def papers_search(
    payload: AcademicSearchRequest,
    user: User = Depends(get_current_user),
) -> AcademicSearchResponse:
    _ = user
    try:
        papers = await search_papers(payload.query.strip(), limit=payload.limit)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Paper search failed: {exc}") from exc
    return AcademicSearchResponse(query=payload.query.strip(), papers=papers)


@router.post("/academic/stream")
async def stream_academic(
    payload: AcademicGenerateRequest,
    user: User = Depends(get_current_user),
    academic: AcademicService = Depends(_academic_service),
) -> StreamingResponse:
    user_id = user.id

    async def event_generator() -> AsyncIterator[str]:
        async with SessionLocal() as db:
            try:
                settings = await settings_service.get_settings_for_user(db, user_id)
                async for chunk, run in academic.stream(
                    db, user_id=user_id, payload=payload, settings=settings
                ):
                    if chunk.done and run is not None:
                        data = {
                            "type": "done",
                            "run_id": run.id,
                            "provider": run.provider,
                            "model": run.model,
                        }
                        yield f"data: {json.dumps(data)}\n\n"
                    elif chunk.text:
                        yield f"data: {json.dumps({'type': 'token', 'text': chunk.text})}\n\n"
            except Exception as exc:  # noqa: BLE001
                yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/academic/improve", response_model=ResearchGenerateResponse)
async def improve_academic(
    payload: AcademicImproveRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    academic: AcademicService = Depends(_academic_service),
) -> ResearchGenerateResponse:
    settings = await settings_service.get_settings_for_user(db, user.id)
    try:
        text, run = await academic.improve(db, user_id=user.id, payload=payload, settings=settings)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Improve failed: {exc}") from exc
    return ResearchGenerateResponse(
        text=text,
        provider=run.provider,
        model=run.model,
        run_id=run.id,
        tokens_in=run.tokens_in,
        tokens_out=run.tokens_out,
    )
