# ============================================================
# Liistro Stock ERP — Dockerfile
# Multi-stage build: slim final image with no build artifacts
# ============================================================

# ── Stage 1: Builder ───────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies (needed for argon2-cffi, asyncpg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ── Stage 2: Production image ──────────────────────────────
FROM python:3.12-slim AS production

WORKDIR /app

# Runtime-only system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual env from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source
COPY . .

# Non-root user for security
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose the application port
EXPOSE 8000

# Uvicorn with:
#   --workers 1: single process (use external orchestration for scaling)
#   --loop uvloop: fastest async event loop available
#   --proxy-headers: trust X-Forwarded-* from reverse proxy/Traefik
#   --forwarded-allow-ips *: Supabase/Vercel edge may forward requests
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--loop", "uvloop", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*", \
     "--workers", "1"]
