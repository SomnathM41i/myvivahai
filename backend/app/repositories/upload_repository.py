"""
app/repositories/upload_repository.py
Data-access layer for the uploads table.
All business logic lives in services — this layer only queries / mutates.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from app.models.upload_model import Upload


class UploadRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── CREATE ────────────────────────────────────────────────────────────
    async def create(self, **kwargs) -> Upload:
        upload = Upload(**kwargs)
        self.db.add(upload)
        await self.db.flush()
        await self.db.refresh(upload)
        return upload

    # ── READ ──────────────────────────────────────────────────────────────
    async def get_by_id(self, upload_id: int) -> Optional[Upload]:
        result = await self.db.execute(
            select(Upload).where(Upload.id == upload_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: int, limit: int = 50) -> list[Upload]:
        result = await self.db.execute(
            select(Upload)
            .where(Upload.user_id == user_id)
            .order_by(Upload.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_paginated(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        file_type: Optional[str] = None,
    ) -> tuple[list[Upload], int]:
        """
        Returns (items, total_count) for the given filters.
        page is 1-indexed.
        """
        base_q = select(Upload).where(Upload.user_id == user_id)

        if search:
            term = f"%{search.lower()}%"
            base_q = base_q.where(
                or_(
                    func.lower(Upload.original_filename).like(term),
                )
            )

        if status:
            base_q = base_q.where(Upload.status == status)

        if file_type:
            base_q = base_q.where(Upload.file_type == file_type)

        # Total count
        count_q = select(func.count()).select_from(base_q.subquery())
        total: int = (await self.db.execute(count_q)).scalar_one()

        # Paginated items
        offset = (page - 1) * page_size
        items_q = (
            base_q
            .order_by(Upload.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        items = list((await self.db.execute(items_q)).scalars().all())

        return items, total

    # ── UPDATE ────────────────────────────────────────────────────────────
    async def update_status(self, upload: Upload, status: str, **kwargs) -> Upload:
        upload.status = status
        for k, v in kwargs.items():
            setattr(upload, k, v)
        await self.db.flush()
        await self.db.refresh(upload)
        return upload

    # ── DELETE ────────────────────────────────────────────────────────────
    async def delete(self, upload: Upload) -> None:
        await self.db.delete(upload)
        await self.db.flush()
