"""
db/session.py
Async SQLAlchemy engine and session factory.
Provides get_db dependency for FastAPI route injection.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

settings = get_settings()

# ---------------------------------------------------------------------------
# Engine
# Tuned pool parameters for Supabase Session Pooler:
#   - pool_size: keep-alive connections (adjust per Supabase plan tier)
#   - max_overflow: burst connections above pool_size
#   - pool_pre_ping: validate connections before use (handles Supabase timeouts)
#   - echo: only enable in development for SQL debug logs
# ---------------------------------------------------------------------------
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=1800,  # recycle connections every 30 min
)

# ---------------------------------------------------------------------------
# Session factory
# expire_on_commit=False keeps loaded attributes accessible after commit,
# which is critical for returning data from ACID transaction service methods.
# ---------------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an AsyncSession per request.
    The session is always closed after the request lifecycle ends,
    even when an exception is raised.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
