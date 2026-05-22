from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.upload_model import Upload
from app.models.profile_model import Profile


async def get_dashboard_stats(user_id: int, db: AsyncSession) -> dict:
    total = await db.scalar(select(func.count(Upload.id)).where(Upload.user_id == user_id))
    done = await db.scalar(select(func.count(Upload.id)).where(
        Upload.user_id == user_id, Upload.status == "done"))
    profile = await db.scalar(select(Profile).where(Profile.user_id == user_id))
    return {
        "total_uploads": total or 0,
        "processed_uploads": done or 0,
        "profile_complete": profile is not None,
        "ai_confidence": profile.ai_confidence if profile else None,
    }
