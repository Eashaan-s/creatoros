import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_ai, get_current_user
from app.db.models import User
from app.db.session import SessionLocal, get_db
from app.modules.settings import service as settings_service
from app.modules.writer.service import WriterService
from app.schemas import WriterGenerateRequest, WriterGenerateResponse, WriterImproveRequest
from app.services.ai.service import AIService

router = APIRouter(prefix="/writer", tags=["writer"])


def _writer_service(ai: AIService = Depends(get_ai)) -> WriterService:
    return WriterService(ai)


@router.post("/generate", response_model=WriterGenerateResponse)
async def generate_writer(
    payload: WriterGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    writer: WriterService = Depends(_writer_service),
) -> WriterGenerateResponse:
    settings = await settings_service.get_settings_for_user(db, user.id)
    try:
        text, run = await writer.generate(db, user_id=user.id, payload=payload, settings=settings)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Generation failed: {exc}") from exc
    return WriterGenerateResponse(
        text=text,
        provider=run.provider,
        model=run.model,
        run_id=run.id,
        tokens_in=run.tokens_in,
        tokens_out=run.tokens_out,
    )


@router.post("/stream")
async def stream_writer(
    payload: WriterGenerateRequest,
    user: User = Depends(get_current_user),
    writer: WriterService = Depends(_writer_service),
) -> StreamingResponse:
    # Own session for SSE lifetime — request-scoped deps close before the generator finishes
    user_id = user.id

    async def event_generator() -> AsyncIterator[str]:
        async with SessionLocal() as db:
            try:
                settings = await settings_service.get_settings_for_user(db, user_id)
                async for chunk, run in writer.stream(
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


@router.post("/improve", response_model=WriterGenerateResponse)
async def improve_writer(
    payload: WriterImproveRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    writer: WriterService = Depends(_writer_service),
) -> WriterGenerateResponse:
    settings = await settings_service.get_settings_for_user(db, user.id)
    try:
        text, run = await writer.improve(db, user_id=user.id, payload=payload, settings=settings)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Improve failed: {exc}") from exc
    return WriterGenerateResponse(
        text=text,
        provider=run.provider,
        model=run.model,
        run_id=run.id,
        tokens_in=run.tokens_in,
        tokens_out=run.tokens_out,
    )
