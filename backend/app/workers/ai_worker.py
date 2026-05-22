# backend/app/workers/ai_worker.py
#
# CHANGED from original:
#   Added _publish() helper that pushes SSE-ready progress events to Redis.
#   Wrapped process_upload() call with stage announcements so the SSE
#   endpoint has something to forward to the browser.
#
# Everything else (Celery config, task binding, retry logic) is unchanged.

import json
from celery import Celery
from app.config import settings

celery_app = Celery(
    "myvivahai",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"


# ── Progress publisher ────────────────────────────────────────────────────

def _publish(task_id: str, stage: str, pct: int, log: str, level: str = "info", profile: dict = None):
    """
    Publish a progress event to the Redis channel that the SSE endpoint
    is subscribed to. Uses the sync Redis client because Celery is sync.
    """
    from app.core.redis import sync_redis  # imported here to avoid circular import at module load

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

    # task_id is the Celery task ID — same value passed to apply_async(task_id=...)
    task_id = self.request.id

    async def _run():
        async with AsyncSessionLocal() as db:
            # ── Stage: OCR / file parsing ─────────────────────────────
            _publish(task_id, "ocr", 10, f"Reading upload #{upload_id}…", "info")

            # ── Stage: LLM ────────────────────────────────────────────
            # process_upload() is your existing service function.
            # We wrap it with before/after announcements.
            # If you want finer granularity, add _publish() calls
            # inside profile_service.py itself.
            _publish(task_id, "llm", 30, "Sending to Groq LLaMA-3…", "ai")

            result = await process_upload(upload_id, db)
            # result is whatever process_upload returns — adapt the
            # field names below to match your actual return value.

            _publish(task_id, "llm", 65, "Groq response received ✓", "ai")

            # ── Stage: structuring ────────────────────────────────────
            _publish(task_id, "structure", 80, "Structuring profile data…", "info")

            # ── Stage: saving ─────────────────────────────────────────
            _publish(task_id, "save", 92, "Saving profile to database…", "info")

            # ── Done ──────────────────────────────────────────────────
            # Build a serialisable profile dict from whatever
            # process_upload() returns. Adjust keys to match your model.
            profile_data = None
            if result:
                profile_data = result if isinstance(result, dict) else {
                    "name":          getattr(result, "name", None),
                    "age":           getattr(result, "age", None),
                    "gender":        getattr(result, "gender", None),
                    "marital_status":getattr(result, "marital_status", None),
                    "city":          getattr(result, "city", None),
                    "education":     getattr(result, "education", None),
                    "occupation":    getattr(result, "occupation", None),
                    "religion":      getattr(result, "religion", None),
                    "caste":         getattr(result, "caste", None),
                    "annual_income": getattr(result, "annual_income", None),
                    "height":        getattr(result, "height", None),
                    "confidence":    getattr(result, "confidence", 0.0),
                }

            _publish(task_id, "done", 100, "Extraction complete ✓", "ok", profile=profile_data)

    try:
        asyncio.run(_run())
    except Exception as exc:
        _publish(self.request.id, "error", 0, f"Error: {str(exc)}", "error")
        raise self.retry(exc=exc)