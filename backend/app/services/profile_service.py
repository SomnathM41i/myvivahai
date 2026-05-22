"""
Main AI pipeline: file extraction → AI parsing → DB save.
Equivalent of BioData-AI services/upload_service.py orchestrator.
"""
import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logger import logger
from app.core.constants import IMAGE_EXTENSIONS, UploadStatus
from app.repositories.upload_repository import UploadRepository
from app.repositories.profile_repository import ProfileRepository
from app.ai.parsers.biodata_parser import parse_biodata
from app.ai.parsers.family_parser import parse_family
from app.ai.parsers.education_parser import parse_education
from app.ai.parsers.occupation_parser import parse_occupation
from app.ai.transformers.response_transformer import merge_parsed_sections
from app.ai.transformers.schema_mapper import map_to_profile_fields


async def process_upload(upload_id: int, db: AsyncSession) -> None:
    upload_repo = UploadRepository(db)
    profile_repo = ProfileRepository(db)
    upload = await upload_repo.get_by_id(upload_id)
    if not upload:
        logger.error(f"Upload {upload_id} not found")
        return
    await upload_repo.update_status(upload, UploadStatus.PROCESSING)
    try:
        # 1. Extract text
        text = _extract_text(upload.file_path, upload.file_type)
        await upload_repo.update_status(upload, UploadStatus.PROCESSING, extracted_text=text)

        # 2. Run AI parsers in parallel
        import asyncio
        results = await asyncio.gather(
            parse_biodata(text), parse_family(text),
            parse_education(text), parse_occupation(text),
            return_exceptions=True)
        biodata, family, education, occupation = [
            r if isinstance(r, dict) else {} for r in results]

        # 3. Merge + map to DB fields
        merged = merge_parsed_sections(biodata, family, education, occupation)
        profile_fields = map_to_profile_fields(merged)

        # 4. Save/update profile
        await profile_repo.upsert(
            user_id=upload.user_id, upload_id=upload_id,
            raw_json=json.dumps(merged), **profile_fields)

        # 5. Mark upload done
        await upload_repo.update_status(upload, UploadStatus.DONE,
            processed_output=json.dumps(merged), profiles_count=1,
            model_used=upload.file_type, completed_at=datetime.now(timezone.utc))
        logger.info(f"Upload {upload_id} processed OK")

    except Exception as e:
        logger.exception(f"Upload {upload_id} failed: {e}")
        await upload_repo.update_status(upload, UploadStatus.FAILED, error_message=str(e))


def _extract_text(file_path: str, file_type: str) -> str:
    ext = file_type.lower()
    if ext == "pdf":
        from app.services.pdf_extraction_service import extract_text_from_pdf
        return extract_text_from_pdf(file_path)
    elif ext in ("docx", "doc"):
        from docx import Document
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    elif ext in IMAGE_EXTENSIONS or ext == "image":
        from app.services.image_preprocessing_service import preprocess_image
        from app.services.ocr_service import extract_text_from_image
        return extract_text_from_image(preprocess_image(file_path))
    elif ext == "txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    raise ValueError(f"Unsupported file type: {file_type}")
