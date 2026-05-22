"""
Main AI pipeline: file extraction → AI parsing → DB save.
Equivalent of BioData-AI services/upload_service.py orchestrator.
"""
import asyncio
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

# Delay between sequential Gemini calls to respect free-tier rate limits (15 req/min).
# Each call needs ~4s gap → safely under 15/min. Set to 0 on a paid plan.
_PARSER_DELAY_SECONDS = 4

# How many chars to send per parser. Biodata info is always near the top of the doc;
# sending the full 188k chars wastes tokens and triggers quota errors.
# 3000 chars ≈ ~750 tokens — plenty for a single biodata entry.
_TEXT_LIMIT = 3000


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

        # Trim once — all parsers share the same trimmed slice.
        # Matrimonial biodata always has personal/family/education/occupation info
        # in the first few hundred chars; no need to send the full document.
        trimmed = text[:_TEXT_LIMIT]
        logger.info(f"Text trimmed to {len(trimmed)} chars (original: {len(text)} chars)")

        # 2. Run AI parsers sequentially to avoid Gemini 429 rate-limit errors.
        #    Firing all 4 at once exhausts both the req/min and token/min quotas.
        logger.info("Running biodata parser…")
        biodata = await parse_biodata(trimmed)

        await asyncio.sleep(_PARSER_DELAY_SECONDS)
        logger.info("Running family parser…")
        family = await parse_family(trimmed)

        await asyncio.sleep(_PARSER_DELAY_SECONDS)
        logger.info("Running education parser…")
        education = await parse_education(trimmed)

        await asyncio.sleep(_PARSER_DELAY_SECONDS)
        logger.info("Running occupation parser…")
        occupation = await parse_occupation(trimmed)

        # Normalise: if any parser returned a non-dict (e.g. an Exception), fall back to {}
        biodata    = biodata    if isinstance(biodata,    dict) else {}
        family     = family     if isinstance(family,     dict) else {}
        education  = education  if isinstance(education,  dict) else {}
        occupation = occupation if isinstance(occupation, dict) else {}

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