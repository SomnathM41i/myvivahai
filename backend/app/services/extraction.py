"""
backend/app/services/extraction.py
Handles text extraction (PDF/DOCX/OCR) and Groq LLM structured profile extraction.
"""

import os
import json
import fitz          # PyMuPDF
import pytesseract
from PIL import Image
from docx import Document
from groq import Groq

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.profile import Profile


GROQ_PROMPT = """
You are a matrimonial biodata extraction assistant.
Extract ALL available information from the text below and return ONLY valid JSON.
No prose, no markdown fences — raw JSON only.

Required fields (use null if missing):
{
  "name": "",
  "age": null,
  "gender": "",
  "dob": "",
  "religion": "",
  "caste": "",
  "community": "",
  "mother_tongue": "",
  "height": "",
  "complexion": "",
  "marital_status": "",
  "education": "",
  "occupation": "",
  "employer": "",
  "annual_income": "",
  "city": "",
  "state": "",
  "country": "",
  "father_name": "",
  "father_occupation": "",
  "mother_name": "",
  "mother_occupation": "",
  "siblings": "",
  "gotra": "",
  "hobbies": [],
  "contact_phone": "",
  "contact_email": "",
  "about": "",
  "confidence": 0.0
}

Biodata text:
"""


class ExtractionService:

    def __init__(self):
        self.groq = Groq(api_key=settings.GROQ_API_KEY)

    # ------------------------------------------------------------------
    # Text extraction
    # ------------------------------------------------------------------

    def extract_text(self, file_path: str) -> str:
        ext = file_path.rsplit(".", 1)[-1].lower()
        if ext == "pdf":
            return self._pdf_text(file_path)
        elif ext in ("docx",):
            return self._docx_text(file_path)
        elif ext in ("jpg", "jpeg", "png", "webp"):
            return self._ocr_text(file_path)
        raise ValueError(f"Unsupported extension: {ext}")

    def _pdf_text(self, path: str) -> str:
        doc = fitz.open(path)
        text = "\n".join(page.get_text() for page in doc)
        if len(text.strip()) < 100:
            # Scanned PDF — fall back to OCR
            text = self._ocr_pdf(path)
        return text

    def _ocr_pdf(self, path: str) -> str:
        doc = fitz.open(path)
        parts = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            parts.append(pytesseract.image_to_string(img))
        return "\n".join(parts)

    def _docx_text(self, path: str) -> str:
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)

    def _ocr_text(self, path: str) -> str:
        img = Image.open(path)
        return pytesseract.image_to_string(img)

    # ------------------------------------------------------------------
    # Groq LLM
    # ------------------------------------------------------------------

    def extract_with_groq(self, raw_text: str) -> dict:
        response = self.groq.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{"role": "user", "content": GROQ_PROMPT + raw_text[:6000]}],
            temperature=0.1,
            max_tokens=1000,
        )
        content = response.choices[0].message.content.strip()
        tokens = response.usage.total_tokens
        result = json.loads(content)
        result["_tokens"] = tokens
        return result

    # ------------------------------------------------------------------
    # Validate & structure
    # ------------------------------------------------------------------

    def validate_and_structure(self, raw: dict) -> dict:
        """Strip internal fields and ensure required keys exist."""
        raw.pop("_tokens", None)
        # Coerce age to int if present
        if raw.get("age") and not isinstance(raw["age"], int):
            try:
                raw["age"] = int(str(raw["age"]).split()[0])
            except (ValueError, IndexError):
                raw["age"] = None
        # Confidence clamp
        raw["confidence"] = max(0.0, min(1.0, float(raw.get("confidence") or 0.0)))
        return raw

    # ------------------------------------------------------------------
    # Persist
    # ------------------------------------------------------------------

    def save_profile(self, profile: dict, user_id: int, task_id: str) -> int:
        with SessionLocal() as db:
            record = Profile(
                user_id=user_id,
                task_id=task_id,
                data=profile,
                name=profile.get("name"),
                age=profile.get("age"),
                city=profile.get("city"),
                confidence=profile.get("confidence", 0.0),
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            return record.id