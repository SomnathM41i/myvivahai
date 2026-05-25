"""
PROBLEM 1 — IMPROVED OCR PIPELINE
===================================
Drop-in replacement for:
  - app/services/image_preprocessing_service.py
  - app/services/ocr_service.py

Key improvements over original:
  1. Auto-rotation correction (deskew)
  2. WhatsApp / low-res image upscaling
  3. Adaptive binarisation (better than plain Otsu for uneven lighting)
  4. Multi-language OCR  (eng + hin + mar — covers mixed biodata text)
  5. Two-engine fallback: EasyOCR kicks in when Tesseract confidence is low
  6. Scanned PDF page-level processing
  7. Digital PDF text extraction (no OCR needed — much faster + accurate)
  8. Structured confidence score per page / per file

Install requirements (add to requirements.txt):
    pytesseract
    Pillow
    opencv-python-headless
    easyocr
    PyMuPDF           # fitz — for PDF handling
    numpy

Tesseract language packs (Ubuntu / Debian):
    sudo apt-get install tesseract-ocr tesseract-ocr-hin tesseract-ocr-mar
"""

from __future__ import annotations

import io
import os
import math
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration — tweak these without touching logic
# ---------------------------------------------------------------------------
OCR_LANG = "eng+hin+mar"          # Tesseract language string — eng+hin+mar covers
                                   # English, Hindi (Devanagari), and Marathi
OCR_CONFIDENCE_THRESHOLD = 50     # Lower threshold — Marathi text scores lower due to
                                   # mixed-script content; 50 is more realistic than 60
MIN_IMAGE_WIDTH = 1200            # Newspaper biodata columns are narrow; upscale more
EASYOCR_LANGUAGES = ["en", "hi"] # EasyOCR language codes (no dedicated Marathi model;
                                   # hi covers Devanagari which Marathi uses)
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "/usr/bin/tesseract")


# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------
@dataclass
class OCRResult:
    text: str
    ocr_confidence: float          # 0.0 – 1.0
    engine_used: str               # "tesseract" | "easyocr" | "digital_pdf"
    pages_processed: int = 1
    warnings: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# 1.  IMAGE PRE-PROCESSING
# ---------------------------------------------------------------------------

def preprocess_image(img_array: np.ndarray) -> np.ndarray:
    """
    Full preprocessing pipeline for a single image (numpy BGR array).

    Steps:
      a) Upscale if too small (WhatsApp compressed images, newspaper scans)
      b) Convert to grayscale
      c) CLAHE contrast enhancement — handles uneven exposure in phone photos
      d) Sharpen — recovers edge detail lost in JPEG compression
      e) Denoise
      f) Deskew (auto-rotate)
      g) Adaptive threshold — handles uneven lighting better than Otsu
         (critical for newspaper biodata pages with grey backgrounds)
    """
    img = _upscale_if_needed(img_array)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # CLAHE contrast enhancement — especially helps dark/washed-out phone photos
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Unsharp mask to recover compressed-away text edges
    blurred = cv2.GaussianBlur(gray, (0, 0), 3)
    gray = cv2.addWeighted(gray, 1.5, blurred, -0.5, 0)

    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    deskewed = _deskew(denoised)

    # Adaptive threshold — MUCH better than global Otsu for
    # WhatsApp-compressed or unevenly lit biodata photos and newspaper pages
    thresh = cv2.adaptiveThreshold(
        deskewed, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=25,     # Smaller block: better for dense Marathi/Hindi glyphs
        C=8,
    )
    return thresh


def _upscale_if_needed(img: np.ndarray) -> np.ndarray:
    """Upscale images that are too small for reliable OCR."""
    h, w = img.shape[:2]
    if w < MIN_IMAGE_WIDTH:
        scale = MIN_IMAGE_WIDTH / w
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        logger.debug(f"Image upscaled from {w}×{h} → {new_w}×{new_h}")
    return img


def _deskew(gray: np.ndarray) -> np.ndarray:
    """
    Detect and correct page rotation using Hough line transform.
    Handles rotated scans and tilted phone photos of biodata.

    Returns the deskewed grayscale image.
    """
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180,
        threshold=100,
        minLineLength=100,
        maxLineGap=10,
    )
    if lines is None:
        return gray

    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        if x2 - x1 != 0:
            angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
            # Only consider near-horizontal lines (text lines)
            if -45 < angle < 45:
                angles.append(angle)

    if not angles:
        return gray

    median_angle = np.median(angles)
    if abs(median_angle) < 0.5:          # No meaningful skew
        return gray

    h, w = gray.shape
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
    rotated = cv2.warpAffine(
        gray, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    logger.debug(f"Deskewed by {median_angle:.2f}°")
    return rotated


# ---------------------------------------------------------------------------
# 2.  TESSERACT OCR
# ---------------------------------------------------------------------------

def _tesseract_ocr(processed: np.ndarray) -> tuple[str, float]:
    """
    Run Tesseract and return (text, confidence_0_to_1).
    Uses image_to_data to get per-word confidence scores.
    """
    try:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
    except ImportError:
        raise RuntimeError("pytesseract not installed")

    pil_img = Image.fromarray(processed)

    # --psm 3 = auto-detect page layout (handles multi-column newspaper biodata)
    # --psm 6 = single uniform block (use for clean single-profile images)
    # We try psm 3 first (better for newspaper multi-profile pages)
    TESS_CONFIG = "--psm 3 --oem 1"

    # Get per-word confidence
    data = pytesseract.image_to_data(
        pil_img,
        lang=OCR_LANG,
        output_type=pytesseract.Output.DICT,
        config=TESS_CONFIG,
    )

    confidences = [
        int(c) for c in data["conf"]
        if str(c).lstrip("-").isdigit() and int(c) >= 0
    ]
    mean_conf = sum(confidences) / len(confidences) if confidences else 0.0

    # Lower word-confidence threshold to 20 for Marathi/Hindi text
    # (Devanagari script typically scores 20-50 even when correctly read)
    words = [
        w for w, c in zip(data["text"], data["conf"])
        if str(c).lstrip("-").isdigit() and int(c) > 20 and w.strip()
    ]
    text = " ".join(words)

    logger.debug(
        f"Tesseract: {len(words)} words, mean_conf={mean_conf:.1f}, "
        f"text_len={len(text)}"
    )

    return text, mean_conf / 100.0    # Normalise to 0-1


# ---------------------------------------------------------------------------
# 3.  EASYOCR FALLBACK
# ---------------------------------------------------------------------------

_easyocr_reader = None


def _get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            # gpu=False — safe for most servers; switch to True if GPU available
            _easyocr_reader = easyocr.Reader(EASYOCR_LANGUAGES, gpu=False)
            logger.info("EasyOCR reader initialised")
        except ImportError:
            raise RuntimeError("easyocr not installed — run: pip install easyocr")
    return _easyocr_reader


def _easyocr_ocr(img_array: np.ndarray) -> tuple[str, float]:
    """
    Run EasyOCR on the ORIGINAL (pre-preprocessed BGR) image.
    EasyOCR has its own internal pipeline; feeding it the binarised image
    actually hurts accuracy.
    """
    reader = _get_easyocr_reader()
    results = reader.readtext(img_array)

    if not results:
        return "", 0.0

    texts = [r[1] for r in results]
    confs = [r[2] for r in results]
    mean_conf = sum(confs) / len(confs)
    text = " ".join(texts)
    return text, mean_conf


# ---------------------------------------------------------------------------
# 4.  SINGLE IMAGE → OCR RESULT
# ---------------------------------------------------------------------------

def ocr_image(file_path: str) -> OCRResult:
    """
    Full pipeline for a single image file.
    Returns OCRResult with text + confidence.
    """
    raw = cv2.imread(file_path)
    if raw is None:
        raise ValueError(f"Cannot read image: {file_path}")

    processed = preprocess_image(raw)

    # --- Try Tesseract first ---
    tess_text, tess_conf = _tesseract_ocr(processed)
    tess_conf_pct = tess_conf * 100

    if tess_conf_pct >= OCR_CONFIDENCE_THRESHOLD and len(tess_text.strip()) > 20:
        logger.info(f"Tesseract OK — conf={tess_conf:.2f}")
        return OCRResult(
            text=tess_text,
            ocr_confidence=round(tess_conf, 2),
            engine_used="tesseract",
        )

    # --- Tesseract confidence too low → try EasyOCR ---
    logger.info(
        f"Tesseract conf={tess_conf:.2f} below threshold "
        f"({OCR_CONFIDENCE_THRESHOLD/100:.2f}) — trying EasyOCR"
    )
    try:
        easy_text, easy_conf = _easyocr_ocr(raw)       # Feed original, not processed
        if easy_conf >= tess_conf and len(easy_text.strip()) > len(tess_text.strip()):
            logger.info(f"EasyOCR selected — conf={easy_conf:.2f}")
            return OCRResult(
                text=easy_text,
                ocr_confidence=round(easy_conf, 2),
                engine_used="easyocr",
            )
    except Exception as e:
        logger.warning(f"EasyOCR fallback failed: {e}")

    # --- Both engines ran; return whichever produced more text ---
    if len(tess_text) >= len(easy_text if "easy_text" in dir() else ""):
        return OCRResult(
            text=tess_text,
            ocr_confidence=round(tess_conf, 2),
            engine_used="tesseract",
            warnings=["Low OCR confidence — consider manual review"],
        )
    return OCRResult(
        text=easy_text,
        ocr_confidence=round(easy_conf, 2),
        engine_used="easyocr",
        warnings=["Low OCR confidence — consider manual review"],
    )


# ---------------------------------------------------------------------------
# 5.  PDF HANDLING — digital + scanned
# ---------------------------------------------------------------------------

def ocr_pdf(file_path: str) -> OCRResult:
    """
    Smart PDF handler:
      - Digital PDFs  → extract text directly (fast, perfect accuracy)
      - Scanned PDFs  → rasterise pages and run image OCR pipeline
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise RuntimeError("PyMuPDF not installed — run: pip install PyMuPDF")

    doc = fitz.open(file_path)
    all_text: list[str] = []
    all_conf: list[float] = []
    engine_used = "digital_pdf"
    warnings: list[str] = []

    for page_num, page in enumerate(doc):
        # Try digital text extraction first
        page_text = page.get_text("text").strip()

        if len(page_text) > 50:
            # Digital page — no OCR needed
            all_text.append(page_text)
            all_conf.append(1.0)   # Digital text = perfect confidence
        else:
            # Scanned page — rasterise and OCR
            engine_used = "tesseract_on_pdf"
            mat = fitz.Matrix(2.0, 2.0)    # 2× zoom = ~144 DPI → good for OCR
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
            img_bytes = pix.tobytes("png")
            nparr = np.frombuffer(img_bytes, np.uint8)
            img_gray = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            result = ocr_image_array(img_gray)
            all_text.append(result.text)
            all_conf.append(result.ocr_confidence)
            if result.warnings:
                warnings.extend(result.warnings)

        logger.debug(f"PDF page {page_num + 1} processed")

    doc.close()

    combined_text = "\n\n".join(all_text)
    mean_conf = sum(all_conf) / len(all_conf) if all_conf else 0.0

    return OCRResult(
        text=combined_text,
        ocr_confidence=round(mean_conf, 2),
        engine_used=engine_used,
        pages_processed=len(all_text),
        warnings=warnings,
    )


def ocr_image_array(raw: np.ndarray) -> OCRResult:
    """Same as ocr_image() but accepts a numpy array directly (used by PDF handler)."""
    processed = preprocess_image(raw)
    tess_text, tess_conf = _tesseract_ocr(processed)
    if tess_conf * 100 >= OCR_CONFIDENCE_THRESHOLD:
        return OCRResult(text=tess_text, ocr_confidence=tess_conf, engine_used="tesseract")
    try:
        easy_text, easy_conf = _easyocr_ocr(raw)
        if easy_conf >= tess_conf:
            return OCRResult(text=easy_text, ocr_confidence=easy_conf, engine_used="easyocr")
    except Exception:
        pass
    return OCRResult(
        text=tess_text,
        ocr_confidence=tess_conf,
        engine_used="tesseract",
        warnings=["Low OCR confidence"],
    )


# ---------------------------------------------------------------------------
# 6.  PUBLIC API — drop-in for profile_service._extract_text()
# ---------------------------------------------------------------------------

def extract_text_with_ocr(file_path: str, file_type: str) -> OCRResult:
    """
    Single entry point used by profile_service.py.

    Usage in profile_service._extract_text():
        from app.services.ocr_pipeline_improved import extract_text_with_ocr
        result = extract_text_with_ocr(file_path, file_type)
        # result.text            → cleaned text to send to Groq
        # result.ocr_confidence  → store in DB / use in confidence calculation
        # result.engine_used     → for debugging / analytics
    """
    ext = file_type.lower()

    if ext == "pdf":
        return ocr_pdf(file_path)

    elif ext in ("jpg", "jpeg", "png", "webp", "tiff", "bmp", "image"):
        return ocr_image(file_path)

    elif ext in ("docx", "doc"):
        from docx import Document
        doc = Document(file_path)
        text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return OCRResult(text=text, ocr_confidence=1.0, engine_used="docx_reader")

    elif ext == "txt":
        text = Path(file_path).read_text(encoding="utf-8", errors="ignore")
        return OCRResult(text=text, ocr_confidence=1.0, engine_used="txt_reader")

    else:
        raise ValueError(f"Unsupported file type: {file_type}")


# ---------------------------------------------------------------------------
# HOW TO INTEGRATE INTO profile_service.py
# ---------------------------------------------------------------------------
# Replace the existing _extract_text() function with this:
#
#   from app.services.ocr_pipeline_improved import extract_text_with_ocr
#
#   def _extract_text(file_path: str, file_type: str) -> tuple[str, float]:
#       result = extract_text_with_ocr(file_path, file_type)
#       return result.text, result.ocr_confidence
#
# Then in process_upload(), capture the ocr_confidence:
#   text, ocr_confidence = _extract_text(upload.file_path, upload.file_type)
#   upload.ocr_confidence = ocr_confidence   # store in DB
# ---------------------------------------------------------------------------