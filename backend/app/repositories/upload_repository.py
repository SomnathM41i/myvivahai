from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from app.models.upload_model import Upload


class UploadRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs) -> Upload:
        upload = Upload(**kwargs)
        self.db.add(upload)
        await self.db.flush()
        await self.db.refresh(upload)
        return upload

    async def get_by_id(self, upload_id: int) -> Optional[Upload]:
        result = await self.db.execute(select(Upload).where(Upload.id == upload_id))
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: int, limit: int = 50) -> List[Upload]:
        result = await self.db.execute(
            select(Upload).where(Upload.user_id == user_id)
            .order_by(Upload.created_at.desc()).limit(limit))
        return list(result.scalars().all())

    async def update_status(self, upload: Upload, status: str, **kwargs) -> Upload:
        upload.status = status
        for k, v in kwargs.items():
            setattr(upload, k, v)
        await self.db.flush()
        await self.db.refresh(upload)
        return upload
