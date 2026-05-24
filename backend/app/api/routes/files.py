"""
app/api/routes/files.py
File management endpoints.
All business logic is delegated to FileService — routes only handle
HTTP concerns (parsing query params, returning responses).
"""
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.auth import get_current_user
from app.database import get_session
from app.schemas.upload_schema import UploadListSchema, UploadResponseSchema
from app.services.file_service import FileService

router = APIRouter(prefix="/api/files", tags=["files"])


def _svc(db: AsyncSession = Depends(get_session)) -> FileService:
    return FileService(db)


@router.get("/", response_model=UploadListSchema)
async def list_files(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=200),
    status: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    svc: FileService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """
    List all uploaded files for the current user.
    Supports pagination, search by filename, and filtering by status / file type.
    """
    return await svc.list_files(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        file_type=file_type,
    )


@router.get("/{file_id}", response_model=UploadResponseSchema)
async def get_file(
    file_id: int,
    svc: FileService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """Get details for a single uploaded file."""
    return await svc.get_file(file_id, current_user.id)


@router.delete("/{file_id}", status_code=204)
async def delete_file(
    file_id: int,
    svc: FileService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """
    Delete an uploaded file and its linked extracted profile.
    Removes the record from the database AND the file from disk.
    """
    await svc.delete_file(file_id, current_user.id)


@router.post("/{file_id}/reprocess", response_model=UploadResponseSchema)
async def reprocess_file(
    file_id: int,
    background_tasks: BackgroundTasks,
    svc: FileService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """
    Re-queue a file for AI extraction.
    Resets status to 'pending' and clears previous output.
    Returns 409 if already processing, 410 if the source file is missing.
    """
    return await svc.reprocess_file(file_id, current_user.id, background_tasks)


@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    svc: FileService = Depends(_svc),
    current_user=Depends(get_current_user),
):
    """Download the original uploaded file."""
    file_path, original_filename = await svc.get_download_path(file_id, current_user.id)
    return FileResponse(
        path=str(file_path),
        filename=original_filename,
        media_type="application/octet-stream",
    )

@router.get("/{file_id}/profile")
async def get_file_profile(
    file_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    """Get the extracted profile linked to a file."""
    from app.repositories.profile_repository import ProfileRepository
    from app.schemas.profile_schema import ProfileSchema
    upload = await FileService(db).get_file(file_id, current_user.id)
    profile = await ProfileRepository(db).get_by_upload_id(upload.id)
    if not profile:
        from fastapi import HTTPException
        raise HTTPException(404, "No profile found for this file")
    return ProfileSchema.model_validate(profile)
