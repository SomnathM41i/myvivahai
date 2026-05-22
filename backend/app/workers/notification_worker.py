from app.workers.ai_worker import celery_app
from app.core.logger import logger


@celery_app.task
def send_processing_complete(user_email: str, upload_id: int):
    logger.info(f"[STUB] Notify {user_email} — upload {upload_id} done")
    # TODO: wire to SendGrid / SES / Firebase
