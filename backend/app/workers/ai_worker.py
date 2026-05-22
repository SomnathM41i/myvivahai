"""
Celery worker for production async AI processing.
Start: celery -A app.workers.ai_worker worker --loglevel=info --concurrency=2
"""
from celery import Celery
from app.config import settings

celery_app = Celery("myvivahai", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"


@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def process_upload_task(self, upload_id: int):
    import asyncio
    from app.database import AsyncSessionLocal
    from app.services.profile_service import process_upload

    async def _run():
        async with AsyncSessionLocal() as db:
            await process_upload(upload_id, db)
    try:
        asyncio.run(_run())
    except Exception as exc:
        raise self.retry(exc=exc)
