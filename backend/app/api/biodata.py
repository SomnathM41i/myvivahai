"""
backend/app/api/routes/biodata.py
Real-time biodata upload + SSE task-progress streaming.
"""

import asyncio
import json
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.services.extraction import ExtractionService
from app.tasks.biodata import run_extraction_task  # Celery task
from app.core.redis import redis_client

router = APIRouter(prefix="/api/biodata", tags=["biodata"])


# ---------------------------------------------------------------------------
# Upload endpoint
# ---------------------------------------------------------------------------

@router.post("/upload")
async def upload_biodata(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept a PDF/DOCX/image, save it, enqueue a Celery extraction task,
    and return the task_id immediately so the client can open an SSE stream.
    """
    allowed = {"application/pdf", "application/vnd.openxmlformats-officedocument"
               ".wordprocessingml.document", "image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    content = await file.read()
    task_id = str(uuid.uuid4())

    # Persist to disk / S3 (swap with S3 upload in prod)
    save_path = f"/tmp/biodata_{task_id}{_ext(file.filename)}"
    with open(save_path, "wb") as f:
        f.write(content)

    # Kick off Celery task
    run_extraction_task.apply_async(
        args=[task_id, save_path, current_user.id],
        task_id=task_id,
    )

    return {"task_id": task_id, "status": "queued"}


# ---------------------------------------------------------------------------
# SSE stream endpoint
# ---------------------------------------------------------------------------

@router.get("/stream/{task_id}")
async def stream_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Server-Sent Events stream for a single extraction task.
    The Celery worker publishes progress events to Redis pub/sub;
    this endpoint subscribes and forwards them to the browser.

    Event shape (JSON):
      { "stage": "ocr"|"llm"|"structure"|"save"|"done",
        "pct": 0-100,
        "log": "human-readable message",
        "level": "info"|"ok"|"error"|"ai",
        "profile": { ... }   <- only on stage=="done"
      }
    """
    return StreamingResponse(
        _sse_generator(task_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )


async def _sse_generator(task_id: str) -> AsyncGenerator[str, None]:
    channel = f"biodata:progress:{task_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    try:
        # Send a heartbeat immediately so the browser knows the stream is alive
        yield _sse({"stage": "connected", "pct": 0, "log": "Stream connected", "level": "info"})

        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = json.loads(message["data"])
            yield _sse(data)
            if data.get("stage") == "done" or data.get("stage") == "error":
                break

            # Heartbeat every ~15 s to keep proxies from closing the connection
            await asyncio.sleep(0)
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _ext(filename: str) -> str:
    return "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""