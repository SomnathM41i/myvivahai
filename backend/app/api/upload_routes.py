import asyncio
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session, AsyncSessionLocal
from app.core.auth import get_current_user
from app.core.constants import IMAGE_EXTENSIONS, UploadStatus
from app.config import settings
from app.repositories.upload_repository import UploadRepository
from app.services.profile_service import process_upload
from app.schemas.upload_schema import UploadResponseSchema, UploadStatusSchema

router = APIRouter(prefix="/api/uploads", tags=["uploads"])
UPLOAD_DIR = Path("storage/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def _process_in_background(upload_id: int):
    async with AsyncSessionLocal() as db:
        await process_upload(upload_id, db)

# Valid extraction modes
VALID_MODES = {"ocr", "vision", "gemini"}


def _file_type(ext: str) -> str:
    return "image" if ext in IMAGE_EXTENSIONS else ext


@router.post("/", response_model=UploadResponseSchema)
async def upload_biodata(
    file: UploadFile = File(...),
    extraction_mode: str = Form("ocr"),   # "ocr", "vision", or "gemini"
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    # Validate mode
    mode = extraction_mode.strip().lower()
    if mode not in VALID_MODES:
        mode = "ocr"

    ext = Path(file.filename).suffix.lstrip(".").lower()
    if ext not in settings.allowed_extensions_set:
        raise HTTPException(400, f"File type .{ext} not allowed")
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(413, f"Exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

    # Vision mode only works for images and PDFs
    file_type = _file_type(ext)
    if mode == "vision" and file_type not in ("image", "pdf"):
        # DOCX / TXT have no pixels — fall back to OCR (text extraction) silently
        mode = "ocr"

    stored = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = UPLOAD_DIR / stored
    file_path.write_bytes(content)

    repo = UploadRepository(db)
    upload = await repo.create(
        user_id=current_user.id,
        original_filename=file.filename,
        stored_filename=stored,
        file_type=file_type,
        file_path=str(file_path),
        extraction_mode=mode,
    )
    asyncio.create_task(_process_in_background(upload.id))
    return upload


@router.get("/", response_model=list[UploadResponseSchema])
async def list_uploads(
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    return await UploadRepository(db).get_by_user(current_user.id)


@router.get("/{upload_id}/status", response_model=UploadStatusSchema)
async def upload_status(
    upload_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    upload = await UploadRepository(db).get_by_id(upload_id)
    if not upload or upload.user_id != current_user.id:
        raise HTTPException(404, "Upload not found")
    return upload


@router.delete("/{upload_id}", status_code=204)
async def delete_upload(
    upload_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    """Delete an upload record and its stored file."""
    repo = UploadRepository(db)
    upload = await repo.get_by_id(upload_id)
    if not upload or upload.user_id != current_user.id:
        raise HTTPException(404, "Upload not found")
    # Remove file from disk
    try:
        Path(upload.file_path).unlink(missing_ok=True)
    except Exception:
        pass  # Don't fail if file already gone
    await repo.delete(upload)


@router.post("/{upload_id}/retry", response_model=UploadResponseSchema)
async def retry_upload(
    upload_id: int,
    db: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    """Re-queue a failed or pending upload for AI processing."""
    repo = UploadRepository(db)
    upload = await repo.get_by_id(upload_id)
    if not upload or upload.user_id != current_user.id:
        raise HTTPException(404, "Upload not found")
    if upload.status == UploadStatus.PROCESSING:
        raise HTTPException(409, "Upload is already processing")
    if not Path(upload.file_path).exists():
        raise HTTPException(410, "Source file no longer exists — please re-upload")
    # Reset status + clear previous error/output
    upload = await repo.update_status(
        upload, UploadStatus.PENDING,
        error_message=None,
        processed_output=None,
        profiles_count=0,
        completed_at=None,
    )
    asyncio.create_task(_process_in_background(upload.id))
    return upload