"""
profile_service.py  — UPDATED VERSION
======================================
Drop this file at:  app/services/profile_service.py

Changes from your original:
  1. Replaces 4 parser calls + 16s of sleep with ONE single-pass call
  2. Captures ocr_confidence from the improved OCR pipeline (Problem 1)
  3. Runs the new confidence scoring system (Problem 3)
  4. Stores confidence_score, confidence_label, needs_review in the DB
  5. Removes _PARSER_DELAY_SECONDS — no longer needed
"""

import json
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import logger
from app.core.constants import IMAGE_EXTENSIONS, UploadStatus
from app.repositories.upload_repository import UploadRepository
from app.repositories.profile_repository import ProfileRepository

# ── New single-pass parser (replaces all 4 separate parsers) ──────────────
from app.ai.parsers.single_pass_parser import parse_biodata_single_pass
from app.ai.llm_client import get_groq_client

# ── New confidence scoring (Problem 3) ────────────────────────────────────
from app.ai.validators.confidence_scoring import compute_confidence

# ── Schema mapper — unchanged ──────────────────────────────────────────────
from app.ai.transformers.schema_mapper import map_to_profile_fields

# Char limit sent to Groq.  6 000 chars ≈ 1 500 tokens — enough for any biodata.
_TEXT_LIMIT = 6000


async def process_upload(upload_id: int, db: AsyncSession) -> None:
    upload_repo  = UploadRepository(db)
    profile_repo = ProfileRepository(db)

    upload = await upload_repo.get_by_id(upload_id)
    if not upload:
        logger.error(f"Upload {upload_id} not found")
        return

    await upload_repo.update_status(upload, UploadStatus.PROCESSING)

    try:
        # ── 1. Extract text (OCR / PDF / DOCX / TXT) ──────────────────────
        text, ocr_confidence = _extract_text(upload.file_path, upload.file_type)
        await upload_repo.update_status(upload, UploadStatus.PROCESSING, extracted_text=text)

        trimmed = text[:_TEXT_LIMIT]
        logger.info(
            f"Upload {upload_id}: {len(trimmed)} chars extracted "
            f"(original {len(text)}) | ocr_conf={ocr_confidence:.2f}"
        )

        # ── 2. Single Groq call (replaces 4 calls + 16 s of sleep) ─────────
        client = get_groq_client()
        parsed = await parse_biodata_single_pass(trimmed, client)
        flat   = parsed.to_flat_dict()

        # ── 3. Confidence scoring ──────────────────────────────────────────
        confidence = compute_confidence(
            extracted_text=text,
            flat_parsed_data=flat,
            tesseract_mean_conf=ocr_confidence if ocr_confidence < 1.0 else None,
            # Pass None for digital PDFs / DOCX / TXT (perfect extraction)
        )
        flat["confidence_score"] = confidence.final_score
        flat["confidence_label"] = confidence.label
        flat["needs_review"]     = confidence.needs_review
        flat["review_reasons"]   = json.dumps(confidence.review_reasons)

        logger.info(
            f"Upload {upload_id}: confidence={confidence.final_score:.2f} "
            f"({confidence.label}) | needs_review={confidence.needs_review}"
        )

        # ── 4. Map to DB fields and save ────────────────────────────────────
        profile_fields = map_to_profile_fields(flat)
        await profile_repo.upsert(
            user_id=upload.user_id,
            upload_id=upload_id,
            raw_json=json.dumps(flat),
            **profile_fields,
        )

        # ── 5. Mark upload done ─────────────────────────────────────────────
        await upload_repo.update_status(
            upload,
            UploadStatus.DONE,
            processed_output=json.dumps(flat),
            profiles_count=1,
            model_used=upload.file_type,
            completed_at=datetime.now(timezone.utc),
        )
        await db.commit()  # ← persist profile + upload status to disk
        logger.info(f"Upload {upload_id} processed OK")

    except Exception as e:
        logger.exception(f"Upload {upload_id} failed: {e}")
        await db.rollback()  # ← discard partial writes from the failed attempt
        await upload_repo.update_status(upload, UploadStatus.FAILED, error_message=str(e))
        await db.commit()    # ← persist the FAILED status so the UI can show the error


def _extract_text(file_path: str, file_type: str) -> tuple[str, float]:
    """
    Returns (text, ocr_confidence).
    ocr_confidence = 1.0 for digital sources (DOCX, TXT, digital PDF).
    ocr_confidence = 0.0–1.0 for image/scanned sources.
    """
    from app.services.ocr_pipeline_improved import extract_text_with_ocr
    result = extract_text_with_ocr(file_path, file_type)
    return result.text, result.ocr_confidence