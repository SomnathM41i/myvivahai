from app.core.logger import logger
import cv2
from paddleocr import PaddleOCR
from pdf2image import convert_from_path
import tempfile
import os

ocr = PaddleOCR(
    use_angle_cls=True,
    lang="en"
)


def preprocess_image(file_path: str) -> str:
    img = cv2.imread(file_path)

    if img is None:
        raise Exception("Failed to read image")

    # grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # upscale
    gray = cv2.resize(gray, None, fx=2, fy=2)

    # denoise
    gray = cv2.fastNlMeansDenoising(gray)

    # sharpen
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
    sharpen = cv2.filter2D(gray, -1, kernel)

    # threshold
    _, thresh = cv2.threshold(
        sharpen,
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
                confidence = line[1][1]

                if confidence > 0.5:
                    lines.append(text)

        final_text = "\n".join(lines)

        logger.info(f"OCR extracted {len(final_text)} chars")

        return final_text.strip()

    except Exception as e:
        logger.error(f"Image OCR failed: {str(e)}")
        return ""


def extract_text_from_pdf(file_path: str) -> str:
    try:
        pages = convert_from_path(file_path)

        all_text = []

        for i, page in enumerate(pages):
            temp_path = os.path.join(
                tempfile.gettempdir(),
                f"pdf_page_{i}.jpg"
            )

            page.save(temp_path, "JPEG")

            text = extract_text_from_image(temp_path)

            all_text.append(text)

        final_text = "\n".join(all_text)

        logger.info(f"PDF OCR extracted {len(final_text)} chars")

        return final_text.strip()

    except Exception as e:
        logger.error(f"PDF OCR failed: {str(e)}")
        return ""