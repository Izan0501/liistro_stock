"""
services/auth_service.py
Authentication and user management business logic.
Handles registration, login, JWT issuance, and password changes.
"""

from __future__ import annotations

import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
)
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    RegisterResponse,
    TokenResponse,
    UserLoginRequest,
    UserPublicResponse,
    UserRegisterRequest,
    UserProfileUpdateRequest,
)

settings = get_settings()



def _effective_registration_secret() -> str:
    """
    Return the secret that incoming registration requests must supply.

    Priority:
      1. REGISTRATION_SECRET_KEY  (dedicated — recommended for production)
      2. SECRET_KEY               (fallback for single-secret local setups)
    """
    return settings.REGISTRATION_SECRET_KEY or settings.SECRET_KEY


async def register_user(
    db: AsyncSession, payload: UserRegisterRequest
) -> RegisterResponse:
    """
    Gate-check → deduplicate → create user → issue JWT — one atomic flow.

    Security notes:
    - `secrets.compare_digest` is a constant-time comparison that prevents
      timing-oracle attacks against the registration secret.
    - The supplied `secret_key` is NEVER echoed back in any response or log.
    - Email is normalised to lowercase before storage and every lookup.
    - Password is hashed with Argon2id before any DB write occurs.

    Raises:
        ForbiddenError:  payload.secret_key does not match the configured secret.
        ConflictError:   email is already registered.
    """
    # ── 1. Constant-time secret validation ───────────────────────────────────
    expected = _effective_registration_secret()
    if not secrets.compare_digest(payload.secret_key, expected):
        raise ForbiddenError("Invalid registration secret key.")

    # ── 2. Duplicate email guard ─────────────────────────────────────────────
    existing = await db.scalar(
        select(User).where(User.email == payload.email.lower())
    )
    if existing:
        raise ConflictError("A user with this email already exists.")

    # ── 3. Persist new user ──────────────────────────────────────────────────
    user = User(
        id=uuid.uuid4(),
        name=payload.full_name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role="admin",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # ── 4. Issue JWT so the frontend can auto-login immediately ───────────────
    token = create_access_token(subject=str(user.id))
    return RegisterResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserPublicResponse.model_validate(user),
    )


async def authenticate_user(
    db: AsyncSession, payload: UserLoginRequest
) -> TokenResponse:
    """
    Validate credentials and return a signed JWT.
    Uniform error message on any mismatch — prevents user enumeration.
    """
    user = await db.scalar(
        select(User).where(User.email == payload.email.lower())
    )
    if not user or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedError("Invalid email or password.")

    if not user.is_active:
        raise UnauthorizedError("Account is deactivated.")

    token = create_access_token(subject=str(user.id))
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    """Fetch user by PK. Raises NotFoundError if missing."""
    user = await db.get(User, user_id)
    if not user:
        raise NotFoundError("User not found.")
    return user


async def change_password(
    db: AsyncSession, user: User, payload: ChangePasswordRequest
) -> None:
    """
    Change authenticated user's password using the system registration secret
    as a master-override. No knowledge of the current password is required.

    Security:
    - `secrets.compare_digest` prevents timing-oracle attacks on the key.
    - The supplied secret is never logged or echoed back.
    """
    expected = _effective_registration_secret()
    if not secrets.compare_digest(payload.secret_key, expected):
        raise ForbiddenError("Clave de registro de sistema inválida.")
    user.hashed_password = hash_password(payload.new_password)
    db.add(user)
    await db.commit()


async def update_profile(
    db: AsyncSession, user: User, payload: UserProfileUpdateRequest
) -> User:
    """Update user's profile details."""
    if payload.email and payload.email.lower() != user.email:
        existing = await db.scalar(
            select(User).where(User.email == payload.email.lower())
        )
        if existing:
            raise ConflictError("A user with this email already exists.")
        user.email = payload.email.lower()

    if payload.name:
        user.name = payload.name

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

