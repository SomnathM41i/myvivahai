from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.core.auth import get_current_user
from app.services.analytics_service import get_dashboard_stats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_session),
                current_user=Depends(get_current_user)):
    return {
        "user": {"name": current_user.name, "email": current_user.email},
        "stats": await get_dashboard_stats(current_user.id, db),
    }
