"""
core/security.py
All cryptographic and authentication helpers:
- Argon2id password hashing via passlib
- JWT token creation and verification via python-jose
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

# ---------------------------------------------------------------------------
# Password hashing — Argon2id (memory-hard, side-channel resistant)
# ---------------------------------------------------------------------------
_pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,   # 64 MiB
    argon2__time_cost=3,
    argon2__parallelism=4,
)


def hash_password(plain: str) -> str:
    """Return Argon2id hash of *plain* password."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------
def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a signed JWT.

    Args:
        subject: Typically the user UUID (stringified).
        expires_delta: Override default expiry; uses settings value if None.

    Returns:
        Encoded JWT string.
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT.

    Raises:
        JWTError: If the token is invalid or expired.

    Returns:
        Decoded payload dict.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
