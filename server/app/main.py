"""
app/main.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Liistro Stock ERP — FastAPI Application Entry Point
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Startup order:
  1. Load Settings (Pydantic BaseSettings)
  2. Attach CORS middleware (strict origin whitelist)
  3. Attach Rate Limiter (slowapi)
  4. Register domain exception handlers
  5. Mount /api/v1 routes
  6. Add /health liveness probe
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.db.session import engine

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — async startup / shutdown (replaces deprecated on_event)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("🚀  Liistro Stock ERP starting up…")
    yield
    logger.info("🛑  Liistro Stock ERP shutting down…")
    await engine.dispose()


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        description=(
            "Enterprise-grade ERP, Stock Control, and Delivery Management API "
            "for Rodrigo Liistro's distribution business."
        ),
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # ── CORS ────────────────────────────────────────────────────────────────
    # Strict allowlist — only registered front-end origins are permitted.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
        expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining"],
    )

    # ── Rate Limiting ────────────────────────────────────────────────────────
    limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # ── Exception Handlers ───────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routes ──────────────────────────────────────────────────────────────
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # ── Health / Liveness probe ──────────────────────────────────────────────
    @app.get(
        "/health",
        tags=["Health"],
        status_code=status.HTTP_200_OK,
        summary="Liveness probe",
    )
    async def health() -> dict:
        return {"status": "ok", "service": settings.PROJECT_NAME}

    return app


app = create_app()
