import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.core.auth import get_current_user
from app.core.constants import IMAGE_EXTENSIONS
from app.config import settings
from app.repositories.upload_repository import UploadRepository
from app.services.profile_service import process_upload
from app.schemas.upload_schema import UploadResponseSchema, UploadStatusSchema

router = APIRouter(prefix="/api/uploads", tags=["uploads"])
UPLOAD_DIR = Path("storage/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _file_type(ext: str) -> str:
    return "image" if ext in IMAGE_EXTENSIONS else ext


@router.post("/", response_model=UploadResponseSchema)
async def upload_biodata(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    ext = Path(file.filename).suffix.lstrip(".").lower()
    if ext not in settings.allowed_extensions_set:
        raise HTTPException(400, f"File type .{ext} not allowed")
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(413, f"Exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")
    stored = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = UPLOAD_DIR / stored
    file_path.write_bytes(content)
    repo = UploadRepository(db)
    upload = await repo.create(
        user_id=current_user.id, original_filename=file.filename,
        stored_filename=stored, file_type=_file_type(ext), file_path=str(file_path))
    background_tasks.add_task(process_upload, upload.id, db)
    return upload


@router.get("/", response_model=list[UploadResponseSchema])
async def list_uploads(db: AsyncSession = Depends(get_session),
                        current_user=Depends(get_current_user)):
    return await UploadRepository(db).get_by_user(current_user.id)


@router.get("/{upload_id}/status", response_model=UploadStatusSchema)
async def upload_status(upload_id: int, db: AsyncSession = Depends(get_session),
                         current_user=Depends(get_current_user)):
    upload = await UploadRepository(db).get_by_id(upload_id)
    if not upload or upload.user_id != current_user.id:
        raise HTTPException(404, "Upload not found")
    return upload
