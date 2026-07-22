"""
api/v1/endpoints/auth.py
Authentication endpoints: register, login, me, change-password.
Rate-limited on login to mitigate brute force.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
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
from app.services import auth_service

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user (requires registration secret key)",
)
async def register(
    payload: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    """
    Self-registration endpoint protected by a shared secret.

    The client must supply `secret_key` matching the server-side
    `REGISTRATION_SECRET_KEY` environment variable (falls back to
    `SECRET_KEY` if not set).

    On success returns:
    - A signed JWT (`access_token`) so the frontend can authenticate
      the new user immediately without a separate login request.
    - The full user profile (`user` object) for local state hydration.

    Errors:
    - **403** if `secret_key` is wrong.
    - **409** if the email is already registered.
    - **422** if the payload fails Pydantic validation.
    """
    return await auth_service.register_user(db, payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate and receive a JWT",
)
async def login(
    payload: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Returns a Bearer token valid for ACCESS_TOKEN_EXPIRE_MINUTES."""
    return await auth_service.authenticate_user(db, payload)


@router.get(
    "/me",
    response_model=UserPublicResponse,
    status_code=status.HTTP_200_OK,
    summary="Get currently authenticated user profile",
)
async def me(current_user: User = Depends(get_current_user)) -> UserPublicResponse:
    return UserPublicResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserPublicResponse,
    status_code=status.HTTP_200_OK,
    summary="Update currently authenticated user profile",
)
async def update_profile(
    payload: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPublicResponse:
    user = await auth_service.update_profile(db, current_user, payload)
    return UserPublicResponse.model_validate(user)


@router.patch(
    "/me/password",
    status_code=status.HTTP_204_NO_CONTENT,
    # RFC 9110 §15.3.5 — 204 MUST carry an empty body; no schema declared.
    summary="Change authenticated user's password",
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await auth_service.change_password(db, current_user, payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
