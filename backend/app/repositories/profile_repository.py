"""
app/repositories/profile_repository.py
Data-access layer for the profiles table.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, inspect
from typing import Optional
from app.models.profile_model import Profile


# Valid column names for the Profile model (computed once at import time)
_PROFILE_COLUMNS: frozenset[str] = frozenset(
    c.key for c in inspect(Profile).mapper.column_attrs
)


def _filter_profile_kwargs(kwargs: dict) -> dict:
    """Strip keys that are not columns on the Profile model."""
    return {k: v for k, v in kwargs.items() if k in _PROFILE_COLUMNS}


class ProfileRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, profile_id: int) -> Optional[Profile]:
        result = await self.db.execute(
            select(Profile).where(Profile.id == profile_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user(self, user_id: int) -> Optional[Profile]:
        result = await self.db.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_upload_id(self, upload_id: int) -> Optional[Profile]:
        result = await self.db.execute(
            select(Profile).where(Profile.upload_id == upload_id)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Profile:
        profile = Profile(**_filter_profile_kwargs(kwargs))
        self.db.add(profile)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def update(self, profile: Profile, **kwargs) -> Profile:
        for k, v in _filter_profile_kwargs(kwargs).items():
            setattr(profile, k, v)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def upsert(self, user_id: int, upload_id: int = None, **kwargs) -> Profile:
        """
        If upload_id is provided, upsert against that specific upload row so
        that re-processing the same file updates the existing record rather
        than duplicating it.  Otherwise fall back to always creating a new row.
        This means every NEW upload creates a NEW profile row — profiles from
        previous uploads are never overwritten or deleted.
        """
        if upload_id is not None:
            profile = await self.get_by_upload_id(upload_id)
            if profile:
                # Re-processing the same upload — update in place
                for k, v in _filter_profile_kwargs(kwargs).items():
                    setattr(profile, k, v)
                await self.db.flush()
                await self.db.refresh(profile)
                return profile

        # New upload → always create a fresh profile row
        return await self.create(user_id=user_id, upload_id=upload_id, **kwargs)

    async def delete(self, profile: Profile) -> None:
        await self.db.delete(profile)
        await self.db.flush()
