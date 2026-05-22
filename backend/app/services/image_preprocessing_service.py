"""Pre-process images for better OCR — grayscale + denoise + threshold."""
from app.core.logger import logger

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


def preprocess_image(file_path: str) -> str:
    if not CV2_AVAILABLE:
        logger.warning("OpenCV not available — skipping preprocessing")
        return file_path
    img = cv2.imread(file_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    out = file_path.replace(".", "_processed.")
    cv2.imwrite(out, thresh)
    return out
