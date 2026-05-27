"""
profile_service.py
==================
Handles both extraction modes:
  - "ocr"    : OCR/text extraction → Groq text LLM  (original pipeline)
  - "vision" : image/PDF sent directly to Groq vision LLM (no OCR step)

The mode is chosen by the user at upload time and stored in uploads.extraction_mode.
"""

import json
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import logger
from app.core.constants import IMAGE_EXTENSIONS, UploadStatus
from app.repositories.upload_repository import UploadRepository
from app.repositories.profile_repository import ProfileRepository

from app.ai.parsers.single_pass_parser import (
    parse_biodata_single_pass,
    parse_biodata_vision,
    parse_biodata_gemini_vision,
)
from app.ai.llm_client import get_groq_client, get_gemini_client
from app.ai.validators.confidence_scoring import compute_confidence
from app.ai.transformers.schema_mapper import map_to_profile_fields

_TEXT_LIMIT = 8000


async def process_upload(upload_id: int, db: AsyncSession) -> dict | None:
    upload_repo  = UploadRepository(db)
    profile_repo = ProfileRepository(db)

    upload = await upload_repo.get_by_id(upload_id)
    if not upload:
        logger.error(f"Upload {upload_id} not found")
        return None

    await upload_repo.update_status(upload, UploadStatus.PROCESSING)

    # Read the chosen mode (default "ocr" for old rows without the column)
    mode = getattr(upload, "extraction_mode", "ocr") or "ocr"
    logger.info(f"Upload {upload_id}: extraction_mode={mode!r}")

    try:
        client = get_groq_client()

        if mode == "vision":
            # ── VISION PATH: Groq vision LLM ────────────────────────────
            parsed = await parse_biodata_vision(
                file_path=upload.file_path,
                file_type=upload.file_type,
                groq_client=client,
            )
            flat          = parsed.to_flat_dict()
            ocr_confidence = None   # No OCR step — skip tesseract conf scoring
            flat["raw_json"] = json.dumps(flat)

            # Store a note in extracted_text so retries / debugging are clear
            await upload_repo.update_status(
                upload, UploadStatus.PROCESSING,
                extracted_text="[vision mode — Groq vision LLM, no OCR text]",
            )

        elif mode == "gemini":
            # ── GEMINI VISION PATH: Gemini vision LLM ───────────────────
            gemini_client = get_gemini_client()
            parsed = await parse_biodata_gemini_vision(
                file_path=upload.file_path,
                file_type=upload.file_type,
                gemini_client=gemini_client,
            )
            flat          = parsed.to_flat_dict()
            ocr_confidence = None
            flat["raw_json"] = json.dumps(flat)

            await upload_repo.update_status(
                upload, UploadStatus.PROCESSING,
                extracted_text="[gemini mode — Gemini vision LLM, no OCR text]",
            )

        else:
            # ── OCR PATH: extract text first, then send to text LLM ──────
            text, ocr_confidence = _extract_text(upload.file_path, upload.file_type)
            await upload_repo.update_status(
                upload, UploadStatus.PROCESSING, extracted_text=text,
            )
            trimmed = text[:_TEXT_LIMIT]
            logger.info(
                f"Upload {upload_id}: {len(trimmed)} chars extracted "
                f"(original {len(text)}) | ocr_conf={ocr_confidence:.2f}"
            )
            parsed = await parse_biodata_single_pass(trimmed, client)
            flat   = parsed.to_flat_dict()

        # ── Handle multi-profile pages (both modes) ───────────────────────
        extra_profiles: list[dict] = flat.pop("profiles", []) or []

        # Extra profiles may also come via _extra_profiles attribute (vision mode)
        _extra = getattr(parsed, "_extra_profiles", [])
        if _extra:
            extra_profiles += [p.to_flat_dict() for p in _extra]

        # ── Confidence scoring ────────────────────────────────────────────
        confidence = compute_confidence(
            extracted_text=flat.get("raw_json", "") or "",
            flat_parsed_data=flat,
            tesseract_mean_conf=ocr_confidence if ocr_confidence and ocr_confidence < 1.0 else None,
        )
        flat["confidence_score"] = confidence.final_score
        flat["confidence_label"] = confidence.label
        flat["needs_review"]     = confidence.needs_review
        flat["review_reasons"]   = json.dumps(confidence.review_reasons)

        logger.info(
            f"Upload {upload_id}: confidence={confidence.final_score:.2f} "
            f"({confidence.label}) | needs_review={confidence.needs_review} | "
            f"mode={mode}"
        )

        # ── Save primary profile ──────────────────────────────────────────
        profile_fields = map_to_profile_fields(flat)
        await profile_repo.upsert(
            user_id=upload.user_id,
            upload_id=upload_id,
            raw_json=json.dumps(flat),
            **profile_fields,
        )

        # ── Save extra profiles from multi-profile pages ──────────────────
        profiles_saved = 1
        for extra_flat in extra_profiles:
            if not isinstance(extra_flat, dict):
                continue
            extra_fields = map_to_profile_fields(extra_flat)
            await profile_repo.create(
                user_id=upload.user_id,
                upload_id=upload_id,
                raw_json=json.dumps(extra_flat),
                **extra_fields,
            )
            profiles_saved += 1
            logger.info(f"Upload {upload_id}: saved extra profile ({profiles_saved})")

        # ── Mark done ─────────────────────────────────────────────────────
        await upload_repo.update_status(
            upload,
            UploadStatus.DONE,
            processed_output=json.dumps(flat),
            profiles_count=profiles_saved,
            model_used=f"{mode}:{upload.file_type}",
            completed_at=datetime.now(timezone.utc),
        )
        await db.commit()
        logger.info(f"Upload {upload_id} processed OK ({mode} mode)")
        return flat

    except Exception as e:
        logger.exception(f"Upload {upload_id} failed: {e}")
        await db.rollback()
        await upload_repo.update_status(upload, UploadStatus.FAILED, error_message=str(e))
        await db.commit()


def _extract_text(file_path: str, file_type: str) -> tuple[str, float]:
    """
    Returns (text, ocr_confidence).
    ocr_confidence = 1.0 for digital sources (DOCX, TXT, digital PDF).
    ocr_confidence = 0.0–1.0 for image/scanned sources.
    """
    from app.services.ocr_pipeline_improved import extract_text_with_ocr
    result = extract_text_with_ocr(file_path, file_type)
    return result.text, result.ocr_confidence