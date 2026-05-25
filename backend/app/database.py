from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=not settings.is_production,
    pool_pre_ping=True,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,           # ← wait up to 30s for lock to clear
    } if "sqlite" in settings.DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession,
    expire_on_commit=False, autoflush=False, autocommit=False,
)


class Base(DeclarativeBase):
    pass


SYNC_DATABASE_URL = settings.DATABASE_URL.replace("+aiosqlite", "")  # sqlite:///... for sync

sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=not settings.is_production,
    pool_pre_ping=True,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,
    } if "sqlite" in SYNC_DATABASE_URL else {},
)

SessionLocal = sessionmaker(
    bind=sync_engine,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def create_tables():
    from app.core.logger import logger
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified.")


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
