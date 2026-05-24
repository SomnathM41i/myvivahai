from app.core.logger import logger
import cv2
from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_angle_cls=True,
    lang="en"
)


def preprocess_image(file_path: str) -> str:
    img = cv2.imread(file_path)

    # grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # upscale image
    gray = cv2.resize(gray, None, fx=2, fy=2)

    # denoise
    gray = cv2.fastNlMeansDenoising(gray)

    # threshold
    _, thresh = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    processed_path = file_path + "_processed.jpg"

    cv2.imwrite(processed_path, thresh)

    return processed_path


def extract_text_from_image(file_path: str) -> str:
    try:
        processed_path = preprocess_image(file_path)

        result = ocr.ocr(processed_path)

        lines = []

        for page in result:
            for line in page:
                text = line[1][0]
                lines.append(text)

        final_text = "\n".join(lines)

        logger.info(f"OCR extracted {len(final_text)} chars")

        return final_text.strip()

    except Exception as e:
        logger.error(f"OCR failed: {str(e)}")
        return ""