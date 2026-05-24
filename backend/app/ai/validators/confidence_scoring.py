"""
confidence_scoring.py  — PROBLEM 3
=====================================
Drop this file at:  app/ai/validators/confidence_scoring.py

Replaces:  app/ai/validators/confidence_validator.py

Provides a consistent, weighted confidence system:
  ocr_confidence  (from OCR engine, Problem 1)
  ai_confidence   (field-population score)
  final_score     (weighted blend with hard caps)
  needs_review    (routing flag for manual review queue)
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Configuration — tune thresholds here without touching the logic below
# ─────────────────────────────────────────────────────────────────────────────

THRESHOLD_AUTO_APPROVE  = 0.70   # final >= this → auto-approve
THRESHOLD_MANUAL_REVIEW = 0.40   # final <  this → flag for human review
# Between 0.40 and 0.70 → "acceptable": saved but not auto-approved

WEIGHT_OCR = 0.35   # OCR quality matters but AI can partially recover OCR errors
WEIGHT_AI  = 0.65   # Field-population score is the stronger signal

# These are the fields your UI (ProfilePreview + EditProfile + BiodataExtractor)
# actually shows. Missing critical fields → confidence is capped.
CRITICAL_FIELDS  = ["full_name", "mobile", "education", "occupation"]
IMPORTANT_FIELDS = [
    "date_of_birth", "religion", "caste", "height", "city", "state",
    "father_name", "mother_name", "annual_income", "marital_status",
]


# ─────────────────────────────────────────────────────────────────────────────
# Result types
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class OCRConfidenceResult:
    score:   float
    reasons: list[str] = field(default_factory=list)


@dataclass
class AIConfidenceResult:
    score:            float
    filled_critical:  int
    missing_critical: list[str] = field(default_factory=list)
    filled_important: int = 0


@dataclass
class FinalConfidence:
    ocr_score:      float
    ai_score:       float
    final_score:    float
    label:          str           # "high" | "acceptable" | "low"
    needs_review:   bool
    auto_approve:   bool
    review_reasons: list[str] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# 1.  OCR CONFIDENCE
# ─────────────────────────────────────────────────────────────────────────────

_OCR_ERROR_PATTERNS = [
    (r"\b[A-Z][a-z]+0[a-z]+\b",  "digit/letter confusion (0↔O)"),
    (r"[|]{2,}",                  "table-border pipe artifacts"),
    (r"[\[\]{}]{3,}",             "bracket artifacts"),
    (r"\b\d{2}[a-z]\d{2}\b",     "number/letter confusion"),
]

_BIODATA_KEYWORDS = [
    "name", "age", "height", "education", "occupation", "father",
    "mother", "religion", "caste", "mobile", "email", "income",
    "naam", "aayi", "baba", "shikshan", "vyavsay",   # Marathi/Hindi
]


def score_ocr_confidence(
    text: str,
    tesseract_mean_conf: Optional[float] = None,
) -> OCRConfidenceResult:
    """
    Compute OCR confidence.

    Formula when Tesseract conf is available (images / scanned PDFs):
        score = 0.60 × tesseract_mean_conf + 0.40 × text_quality_score

    Formula when NOT available (digital PDF, DOCX, TXT):
        score = text_quality_score
        (These sources produce near-perfect text so quality is typically ~1.0)
    """
    reasons: list[str] = []
    quality = _text_quality_score(text, reasons)

    if tesseract_mean_conf is not None:
        score = 0.60 * tesseract_mean_conf + 0.40 * quality
    else:
        score = quality

    return OCRConfidenceResult(score=round(max(0.0, min(1.0, score)), 3), reasons=reasons)


def _text_quality_score(text: str, reasons: list[str]) -> float:
    score = 1.0

    if not text or len(text.strip()) < 20:
        reasons.append("Text too short — possible blank page or failed OCR")
        return 0.05

    for pattern, label in _OCR_ERROR_PATTERNS:
        hits = re.findall(pattern, text)
        if len(hits) > 3:
            penalty = min(0.15, len(hits) * 0.02)
            score  -= penalty
            reasons.append(f"OCR artifacts: {label} ({len(hits)} instances)")

    found = sum(1 for kw in _BIODATA_KEYWORDS if kw.lower() in text.lower())
    score += min(0.20, found * 0.025)    # Keyword bonus: up to +0.20

    word_count = len(text.split())
    if word_count < 30:
        score -= 0.20
        reasons.append(f"Low word count ({word_count}) — possible extraction issue")

    return max(0.0, min(1.0, score))


# ─────────────────────────────────────────────────────────────────────────────
# 2.  AI CONFIDENCE (field-population)
# ─────────────────────────────────────────────────────────────────────────────

def score_ai_confidence(flat_data: dict) -> AIConfidenceResult:
    """
    Score based on how many important fields the AI actually populated.

    Formula:
        ai_score = 0.70 × (critical_filled / total_critical)
                 + 0.30 × (important_filled / total_important)
    """

    def filled(v) -> bool:
        if v is None:
            return False
        return str(v).strip().lower() not in ("", "null", "none", "n/a", "na", "unknown")

    critical_filled  = [f for f in CRITICAL_FIELDS  if filled(flat_data.get(f))]
    missing_critical = [f for f in CRITICAL_FIELDS  if not filled(flat_data.get(f))]
    important_filled = [f for f in IMPORTANT_FIELDS if filled(flat_data.get(f))]

    cr = len(critical_filled)  / len(CRITICAL_FIELDS)
    ir = len(important_filled) / len(IMPORTANT_FIELDS) if IMPORTANT_FIELDS else 1.0

    score = 0.70 * cr + 0.30 * ir

    return AIConfidenceResult(
        score=round(max(0.0, min(1.0, score)), 3),
        filled_critical=len(critical_filled),
        missing_critical=missing_critical,
        filled_important=len(important_filled),
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3.  FINAL WEIGHTED CONFIDENCE
# ─────────────────────────────────────────────────────────────────────────────

def calculate_final_confidence(
    ocr_score: float,
    ai_score:  float,
    missing_critical_fields: Optional[list[str]] = None,
) -> FinalConfidence:
    """
    Combines OCR and AI scores with hard caps for bad conditions.

    Formula:
        final = 0.35 × ocr_score + 0.65 × ai_score

    Hard caps applied after weighting:
        missing critical fields → cap at 0.65
        very poor OCR (<0.30)   → cap at 0.55

    This directly solves your "OCR=0.2, AI=0.55, final=0.55" inconsistency:
    with these weights, OCR quality now *reduces* the final score proportionally.
    """
    final          = WEIGHT_OCR * ocr_score + WEIGHT_AI * ai_score
    review_reasons: list[str] = []

    if missing_critical_fields:
        for f in missing_critical_fields:
            review_reasons.append(f"Critical field missing: {f}")
        final = min(final, 0.65)

    if ocr_score < 0.30:
        review_reasons.append(f"Low OCR quality (score={ocr_score:.2f})")
        final = min(final, 0.55)

    final = round(max(0.0, min(1.0, final)), 3)

    needs_review = final < THRESHOLD_MANUAL_REVIEW
    auto_approve = final >= THRESHOLD_AUTO_APPROVE

    if auto_approve:
        label = "high"
    elif final >= THRESHOLD_MANUAL_REVIEW:
        label = "acceptable"
    else:
        label = "low"
        if not review_reasons:
            review_reasons.append("Low overall confidence — manual review recommended")

    return FinalConfidence(
        ocr_score=round(ocr_score, 3),
        ai_score=round(ai_score, 3),
        final_score=final,
        label=label,
        needs_review=needs_review,
        auto_approve=auto_approve,
        review_reasons=review_reasons,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 4.  SINGLE ENTRY POINT  — called from profile_service.py
# ─────────────────────────────────────────────────────────────────────────────

def compute_confidence(
    extracted_text:       str,
    flat_parsed_data:     dict,
    tesseract_mean_conf:  Optional[float] = None,
) -> FinalConfidence:
    """
    One call from profile_service.py after parsing.

    Args:
        extracted_text:      Raw text from OCR/extraction step
        flat_parsed_data:    ParsedBiodata.to_flat_dict()
        tesseract_mean_conf: OCR engine confidence (0.0–1.0) if available.
                             Pass None for digital PDFs, DOCX, TXT.
    Returns:
        FinalConfidence with .final_score, .needs_review, .auto_approve, .label
    """
    ocr_result = score_ocr_confidence(extracted_text, tesseract_mean_conf)
    ai_result  = score_ai_confidence(flat_parsed_data)

    final = calculate_final_confidence(
        ocr_score=ocr_result.score,
        ai_score=ai_result.score,
        missing_critical_fields=ai_result.missing_critical,
    )

    logger.info(
        f"Confidence | OCR={ocr_result.score:.2f} "
        f"AI={ai_result.score:.2f} "
        f"Final={final.final_score:.2f} ({final.label}) "
        f"needs_review={final.needs_review}"
    )
    if final.review_reasons:
        logger.info(f"Review reasons: {final.review_reasons}")

    return final