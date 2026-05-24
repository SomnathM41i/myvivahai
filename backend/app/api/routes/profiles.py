"""
app/api/routes/profiles.py
Profile (generated biodata) management endpoints.
All business logic lives in ProfileDataService.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database import get_session
from app.schemas.profile_schema import ProfileSchema, ProfileUpdateSchema
from app.services.profile_data_service import ProfileDataService

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


def _svc(db: AsyncSession = Depends(get_session)) -> ProfileDataService:
    return ProfileDataService(db)


@router.get("/{profile_id}", response_model=ProfileSchema)
async def get_profile(
    profile_id: int,
    svc: ProfileDataService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """Retrieve the extracted profile data for a given profile ID."""
    return await svc.get_profile(profile_id, current_user.id)


@router.put("/{profile_id}", response_model=ProfileSchema)
async def update_profile(
    profile_id: int,
    data: ProfileUpdateSchema,
    svc: ProfileDataService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """
    Edit extracted profile fields.
    Accepts a partial update — only provided fields are changed.
    Also syncs the linked upload's processed_output JSON.
    """
    return await svc.update_profile(profile_id, current_user.id, data)


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(
    profile_id: int,
    svc: ProfileDataService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """Delete extracted profile data (does NOT delete the source file)."""
    await svc.delete_profile(profile_id, current_user.id)


@router.get("/{profile_id}/export/json")
async def export_profile_json(
    profile_id: int,
    svc: ProfileDataService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """Download the extracted profile as a formatted JSON file."""
    data = await svc.export_json(profile_id, current_user.id)
    return Response(
        content=data,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=profile_{profile_id}.json"},
    )


@router.get("/{profile_id}/export/csv")
async def export_profile_csv(
    profile_id: int,
    svc: ProfileDataService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """Download the extracted profile as a CSV file."""
    data = await svc.export_csv(profile_id, current_user.id)
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=profile_{profile_id}.csv"},
    )


@router.get("/{profile_id}/export/xlsx")
async def export_profile_xlsx(
    profile_id: int,
    svc: ProfileDataService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """Download the extracted profile as an Excel (.xlsx) file."""
    data = await svc.export_xlsx(profile_id, current_user.id)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=profile_{profile_id}.xlsx"},
    )
