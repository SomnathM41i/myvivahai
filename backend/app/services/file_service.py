"""
app/services/file_service.py
Business logic for file management operations.
Routes call this — never query the DB or touch the filesystem directly.
"""
import math
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UploadStatus
from app.core.logger import logger
from app.repositories.upload_repository import UploadRepository
from app.repositories.profile_repository import ProfileRepository
from app.schemas.upload_schema import UploadListSchema, UploadResponseSchema


class FileService:
    def __init__(self, db: AsyncSession):
        self._db = db
        self._upload_repo = UploadRepository(db)
        self._profile_repo = ProfileRepository(db)

    async def list_files(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        file_type: Optional[str] = None,
    ) -> UploadListSchema:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)

        items, total = await self._upload_repo.list_paginated(
            user_id=user_id,
            page=page,
            page_size=page_size,
            search=search,
            status=status,
            file_type=file_type,
        )
        total_pages = math.ceil(total / page_size) if total else 1

        return UploadListSchema(
            items=[UploadResponseSchema.model_validate(u) for u in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_file(self, upload_id: int, user_id: int):
        upload = await self._upload_repo.get_by_id(upload_id)
        if not upload or upload.user_id != user_id:
            raise HTTPException(404, "File not found")
        return upload

    async def delete_file(self, upload_id: int, user_id: int) -> None:
        upload = await self._get_owned(upload_id, user_id)

        # Delete linked profile data
        profile = await self._profile_repo.get_by_upload_id(upload_id)
        if profile:
            await self._profile_repo.delete(profile)

        # Remove file from disk
        try:
            Path(upload.file_path).unlink(missing_ok=True)
        except Exception as exc:
            logger.warning(f"Could not delete file {upload.file_path}: {exc}")

        await self._upload_repo.delete(upload)
        await self._db.commit()

    async def reprocess_file(
        self,
        upload_id: int,
        user_id: int,
        background_tasks: BackgroundTasks,
    ):
        upload = await self._get_owned(upload_id, user_id)

        if upload.status == UploadStatus.PROCESSING:
            raise HTTPException(409, "File is already being processed")

        if not Path(upload.file_path).exists():
            raise HTTPException(410, "Source file no longer exists — please re-upload")

        upload = await self._upload_repo.update_status(
            upload,
            UploadStatus.PENDING,
            error_message=None,
            processed_output=None,
            profiles_count=0,
            completed_at=None,
        )
        await self._db.commit()

        # Import here to avoid circular imports
        from app.services.profile_service import process_upload
        background_tasks.add_task(process_upload, upload.id, self._db)

        return upload

    async def get_download_path(self, upload_id: int, user_id: int) -> Path:
        upload = await self._get_owned(upload_id, user_id)
        file_path = Path(upload.file_path)
        if not file_path.exists():
            raise HTTPException(410, "File no longer exists on disk")
        return file_path, upload.original_filename

    # ── private ────────────────────────────────────────────────────────────
    async def _get_owned(self, upload_id: int, user_id: int):
        upload = await self._upload_repo.get_by_id(upload_id)
        if not upload or upload.user_id != user_id:
            raise HTTPException(404, "File not found")
        return upload
