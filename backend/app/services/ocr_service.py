"""OCR via Tesseract — ported from BioData-AI ImageProcessor."""
from app.config import settings
from app.core.logger import logger

try:
    import pytesseract
    from PIL import Image
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logger.warning("pytesseract/Pillow not installed")


def extract_text_from_image(file_path: str) -> str:
    if not OCR_AVAILABLE:
        raise RuntimeError("pytesseract not installed")
    image = Image.open(file_path)
    text = pytesseract.image_to_string(image, lang="eng")
    logger.info(f"OCR extracted {len(text)} chars")
    return text.strip()
