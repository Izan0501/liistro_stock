"""
core/config.py
Centralised, type-safe application settings powered by Pydantic v2 BaseSettings.
All values are loaded from environment variables / .env file.
"""

from __future__ import annotations

from decimal import Decimal
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Application
    # ------------------------------------------------------------------
    PROJECT_NAME: str = "Liistro Stock ERP"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["development", "production", "testing"] = "development"

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------
    DATABASE_URL: str = Field(
        ...,
        description="Async PostgreSQL URL: postgresql+asyncpg://user:pass@host:port/db",
    )

    # ------------------------------------------------------------------
    # JWT
    # ------------------------------------------------------------------
    SECRET_KEY: str = Field(..., min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 h

    # Secret required in the registration payload to gate self-registration.
    # If not set, falls back to SECRET_KEY (convenient for single-secret setups).
    # Set a dedicated value in production: openssl rand -hex 24
    REGISTRATION_SECRET_KEY: str | None = Field(default=None)

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: str) -> str:  # kept as str; parsed in property below
        return v

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # ------------------------------------------------------------------
    # Rate Limiting
    # ------------------------------------------------------------------
    RATE_LIMIT_AUTH: str = "10/minute"
    RATE_LIMIT_DEFAULT: str = "60/minute"

    # ------------------------------------------------------------------
    # Financial
    # ------------------------------------------------------------------
    INITIAL_CAPITAL: Decimal = Decimal("0.00")


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()  # type: ignore[call-arg]
