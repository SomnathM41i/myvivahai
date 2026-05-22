# backend/app/api/routes/biodata.py
#
# Two endpoints:
#   POST /api/biodata/upload  — accepts file, queues Celery task, returns task_id
#   GET  /api/biodata/stream/{task_id} — SSE stream of progress events

import asyncio
import json
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.core.redis import redis_client
from app.workers.ai_worker import process_upload_task
from app.database import AsyncSessionLocal
from app.models.upload_model import Upload

router = APIRouter(prefix="/api/biodata", tags=["biodata"])

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
}


# ── Upload ────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_biodata(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported type: {file.content_type}")

    content = await file.read()
    task_id = str(uuid.uuid4())

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    save_path = f"/tmp/biodata_{task_id}.{ext}"
    with open(save_path, "wb") as f:
        f.write(content)

    # Use actual column names from upload_model.py
    # user_id is required (FK) — TODO: replace 1 with current_user.id after adding auth dep
    async with AsyncSessionLocal() as db:
        upload = Upload(
            user_id=1,
            original_filename=file.filename,
            stored_filename=f"biodata_{task_id}.{ext}",
            file_type=ext,
            file_path=save_path,
            status="queued",
        )
        db.add(upload)
        await db.commit()
        await db.refresh(upload)
        upload_id = upload.id

    # task_id passed as Celery task ID so worker can publish to the right channel
    process_upload_task.apply_async(args=[upload_id], task_id=task_id)

    return {"task_id": task_id, "upload_id": upload_id, "status": "queued"}


# ── SSE stream ────────────────────────────────────────────────────────────

@router.get("/stream/{task_id}")
async def stream_task(task_id: str):
    return StreamingResponse(
        _sse_generator(task_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


async def _sse_generator(task_id: str) -> AsyncGenerator[str, None]:
    channel = f"biodata:progress:{task_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    yield _fmt({"stage": "connected", "pct": 0, "log": "Stream connected", "level": "info"})

    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.05)
            if message and message["type"] == "message":
                data = json.loads(message["data"])
                yield _fmt(data)
                if data.get("stage") in ("done", "error"):
                    break
            else:
                await asyncio.sleep(0.5)
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()


def _fmt(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"