from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.models.profile_model import Profile


class ProfileRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user(self, user_id: int) -> Optional[Profile]:
        result = await self.db.execute(select(Profile).where(Profile.user_id == user_id))
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Profile:
        profile = Profile(**kwargs)
        self.db.add(profile)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def upsert(self, user_id: int, **kwargs) -> Profile:
        profile = await self.get_by_user(user_id)
        if profile:
            for k, v in kwargs.items():
                setattr(profile, k, v)
            await self.db.flush()
            await self.db.refresh(profile)
        else:
            profile = await self.create(user_id=user_id, **kwargs)
        return profile
