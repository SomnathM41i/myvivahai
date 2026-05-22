from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.profile_model import Profile


async def find_matches(user_id: int, db: AsyncSession, limit: int = 10) -> List[Profile]:
    my_profile = await db.scalar(select(Profile).where(Profile.user_id == user_id))
    if not my_profile:
        return []
    query = select(Profile).where(Profile.user_id != user_id)
    if my_profile.religion:
        query = query.where(Profile.religion == my_profile.religion)
    result = await db.execute(query.limit(limit))
    return list(result.scalars().all())
