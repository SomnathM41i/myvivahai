"""Pre-process images for better OCR — grayscale + denoise + threshold."""
from app.core.logger import logger

try:
    import cv2
except ImportError:
    cv2 = None


def preprocess_image(file_path: str) -> str:
    if cv2 is None:
        raise ImportError("cv2 (opencv-python) is not installed")
    img = cv2.imread(file_path)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # upscale
    gray = cv2.resize(gray, None, fx=2, fy=2)

    # denoise
    gray = cv2.fastNlMeansDenoising(gray)

    # sharpen
    kernel = [[0,-1,0],[-1,5,-1],[0,-1,0]]
    kernel = cv2.UMat(kernel)

    sharpened = cv2.filter2D(gray, -1, kernel)

    # threshold
    _, thresh = cv2.threshold(
        sharpened,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    output = file_path.replace(".", "_processed.")

    cv2.imwrite(output, thresh)

    return output