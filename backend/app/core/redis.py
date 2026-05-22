# backend/app/core/redis.py
#
# Two Redis clients:
#   redis_client  — async, used by FastAPI SSE endpoint (subscribe)
#   sync_redis    — sync,  used by Celery tasks (publish)
#
# Both read REDIS_URL from your existing app.config.settings.

import redis
import redis.asyncio as aioredis
from app.config import settings

# ── Async client (FastAPI) ────────────────────────────────────────────────
redis_client: aioredis.Redis = aioredis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)

# ── Sync client (Celery worker) ───────────────────────────────────────────
sync_redis = redis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)