# backend/app/core/redis.py
# Provides both an async Redis client (for FastAPI SSE) and a
# sync client (for Celery tasks).

import os
import redis
import redis.asyncio as aioredis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Async — used in FastAPI SSE endpoint
redis_client: aioredis.Redis = aioredis.from_url(
    REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)

# Sync — used in Celery tasks
sync_redis = redis.from_url(
    REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)