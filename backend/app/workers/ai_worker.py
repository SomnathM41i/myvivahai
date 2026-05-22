# backend/app/workers/ai_worker.py

import json
from celery import Celery
from app.config import settings

# ── CRITICAL: import all models so SQLAlchemy can resolve every FK ────────
import app.models  # noqa: F401 — registers User, Upload, Profile, Match with metadata

celery_app = Celery(
    "myvivahai",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"


# ── Progress publisher ────────────────────────────────────────────────────

def _publish(task_id: str, stage: str, pct: int, log: str, level: str = "info", profile: dict = None):
    from app.core.redis import sync_redis

    payload = {"stage": stage, "pct": pct, "log": log, "level": level}
    if profile:
        payload["profile"] = profile
    sync_redis.publish(f"biodata:progress:{task_id}", json.dumps(payload))


# ── Celery task ───────────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def process_upload_task(self, upload_id: int):
    import asyncio
    from app.database import AsyncSessionLocal
    from app.services.profile_service import process_upload

    task_id = self.request.id

    async def _run():
        async with AsyncSessionLocal() as db:
            _publish(task_id, "ocr", 10, f"Reading upload #{upload_id}…", "info")
            _publish(task_id, "llm", 30, "Sending to Groq LLaMA-3…", "ai")

            result = await process_upload(upload_id, db)

            _publish(task_id, "llm", 65, "Groq response received ✓", "ai")
            _publish(task_id, "structure", 80, "Structuring profile data…", "info")
            _publish(task_id, "save", 92, "Saving profile to database…", "info")

            profile_data = None
            if result:
                profile_data = result if isinstance(result, dict) else {
                    "name":           getattr(result, "name", None),
                    "age":            getattr(result, "age", None),
                    "gender":         getattr(result, "gender", None),
                    "marital_status": getattr(result, "marital_status", None),
                    "city":           getattr(result, "city", None),
                    "education":      getattr(result, "education", None),
                    "occupation":     getattr(result, "occupation", None),
                    "religion":       getattr(result, "religion", None),
                    "caste":          getattr(result, "caste", None),
                    "annual_income":  getattr(result, "annual_income", None),
                    "height":         getattr(result, "height", None),
                    "confidence":     getattr(result, "confidence", 0.0),
                }

            _publish(task_id, "done", 100, "Extraction complete ✓", "ok", profile=profile_data)

    try:
        asyncio.run(_run())
    except Exception as exc:
        _publish(self.request.id, "error", 0, f"Error: {str(exc)}", "error")
        raise self.retry(exc=exc)