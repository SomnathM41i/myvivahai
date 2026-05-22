from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.core.auth import get_current_user
from app.repositories.profile_repository import ProfileRepository
from app.schemas.profile_schema import ProfileSchema, ProfileUpdateSchema

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/", response_model=ProfileSchema)
async def get_profile(db: AsyncSession = Depends(get_session),
                       current_user=Depends(get_current_user)):
    profile = await ProfileRepository(db).get_by_user(current_user.id)
    if not profile:
        raise HTTPException(404, "No profile yet — upload a biodata first.")
    return profile


@router.patch("/", response_model=ProfileSchema)
async def update_profile(updates: ProfileUpdateSchema,
                          db: AsyncSession = Depends(get_session),
                          current_user=Depends(get_current_user)):
    return await ProfileRepository(db).upsert(
        current_user.id, **updates.model_dump(exclude_none=True))
