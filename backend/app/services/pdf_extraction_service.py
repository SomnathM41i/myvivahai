"""PDF text extraction using PyMuPDF — ported from BioData-AI core/reader.py PdfProcessor."""
from pathlib import Path
from app.core.logger import logger

try:
    import fitz
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF not installed. Run: pip install pymupdf")


def extract_text_from_pdf(file_path: str, max_chars_per_page: int = 5000) -> str:
    if not PYMUPDF_AVAILABLE:
        raise RuntimeError("PyMuPDF not installed")
    doc = fitz.open(str(file_path))
    pages = []
    for page in doc:
        text = page.get_text("text").strip()
        if text:
            pages.append(text[:max_chars_per_page])
    doc.close()
    full_text = "\n\n".join(pages)
    logger.info(f"PDF extracted: {len(full_text)} chars from {len(pages)} pages")
    return full_text
