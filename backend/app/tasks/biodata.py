"""
backend/app/tasks/biodata.py
Celery worker task — runs the full extraction pipeline and
publishes SSE-ready progress events to Redis pub/sub.
"""

import json
import time
from celery import shared_task
from app.core.redis import sync_redis          # sync Redis client for Celery
from app.services.extraction import ExtractionService


def _publish(task_id: str, stage: str, pct: int, log: str, level: str = "info", profile: dict = None):
    """Push a progress event to Redis so the SSE endpoint can forward it."""
    payload = {"stage": stage, "pct": pct, "log": log, "level": level}
    if profile:
        payload["profile"] = profile
    sync_redis.publish(f"biodata:progress:{task_id}", json.dumps(payload))


@shared_task(bind=True, name="tasks.run_extraction")
def run_extraction_task(self, task_id: str, file_path: str, user_id: int):
    svc = ExtractionService()

    try:
        # ── Stage 1: parse / OCR ─────────────────────────────────────────
        _publish(task_id, "ocr", 10, f"Reading file: {file_path.split('/')[-1]}", "info")
        raw_text = svc.extract_text(file_path)
        _publish(task_id, "ocr", 25, f"Extracted {len(raw_text):,} chars", "ok")

        # ── Stage 2: Groq LLM ────────────────────────────────────────────
        _publish(task_id, "llm", 35, "Sending to Groq LLaMA-3 (llama3-70b-8192)…", "ai")
        raw_profile = svc.extract_with_groq(raw_text)
        _publish(task_id, "llm", 60, f"Groq response: {raw_profile.get('_tokens', '?')} tokens", "ai")

        # ── Stage 3: validate & structure ────────────────────────────────
        _publish(task_id, "structure", 70, "Validating profile schema…", "info")
        profile = svc.validate_and_structure(raw_profile)
        _publish(task_id, "structure", 82, "Schema validated ✓", "ok")

        # ── Stage 4: persist ─────────────────────────────────────────────
        _publish(task_id, "save", 88, "Writing profile to database…", "info")
        profile_id = svc.save_profile(profile, user_id, task_id)
        _publish(task_id, "save", 95, f"Profile #{profile_id} saved ✓", "ok")

        # ── Stage 5: done ─────────────────────────────────────────────────
        _publish(task_id, "done", 100, "Extraction complete", "ok", profile=profile)

    except Exception as exc:
        _publish(task_id, "error", 0, f"Error: {str(exc)}", "error")
        raise self.retry(exc=exc, countdown=5, max_retries=2)