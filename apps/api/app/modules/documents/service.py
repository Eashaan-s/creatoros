from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Document
from app.schemas import DocumentCreate, DocumentUpdate


async def list_documents(
    db: AsyncSession,
    user_id: str,
    *,
    module: str | None = None,
    include_archived: bool = False,
) -> list[Document]:
    stmt = select(Document).where(Document.user_id == user_id).order_by(Document.updated_at.desc())
    if module:
        stmt = stmt.where(Document.module == module)
    if not include_archived:
        stmt = stmt.where(Document.status != "archived")
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_document(db: AsyncSession, user_id: str, document_id: str) -> Document | None:
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_document(db: AsyncSession, user_id: str, payload: DocumentCreate) -> Document:
    doc = Document(
        id=str(uuid.uuid4()),
        user_id=user_id,
        module=payload.module,
        title=payload.title,
        content_html=payload.content_html,
        content_markdown=payload.content_markdown,
        prompt_meta=payload.prompt_meta or {},
        status=payload.status,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


async def update_document(
    db: AsyncSession, user_id: str, document_id: str, payload: DocumentUpdate
) -> Document | None:
    doc = await get_document(db, user_id, document_id)
    if doc is None:
        return None
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(doc, key, value)
    await db.flush()
    await db.refresh(doc)
    return doc


async def delete_document(db: AsyncSession, user_id: str, document_id: str) -> bool:
    doc = await get_document(db, user_id, document_id)
    if doc is None:
        return False
    await db.delete(doc)
    await db.flush()
    return True


async def duplicate_document(db: AsyncSession, user_id: str, document_id: str) -> Document | None:
    doc = await get_document(db, user_id, document_id)
    if doc is None:
        return None
    clone = Document(
        id=str(uuid.uuid4()),
        user_id=user_id,
        module=doc.module,
        title=f"{doc.title} (Copy)",
        content_html=doc.content_html,
        content_markdown=doc.content_markdown,
        prompt_meta=dict(doc.prompt_meta or {}),
        status="saved",
    )
    db.add(clone)
    await db.flush()
    await db.refresh(clone)
    return clone
