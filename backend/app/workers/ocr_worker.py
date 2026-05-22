from app.workers.ai_worker import celery_app


@celery_app.task
def ocr_task(file_path: str) -> str:
    from app.services.image_preprocessing_service import preprocess_image
    from app.services.ocr_service import extract_text_from_image
    return extract_text_from_image(preprocess_image(file_path))
