"""
schemas/auth.py
Pydantic v2 schemas for authentication flows.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegisterRequest(BaseModel):
    """
    Payload for POST /auth/register.
    `secret_key` is validated server-side against REGISTRATION_SECRET_KEY
    and is never echoed back in any response.
    """

    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    # Write-only — gating field so random internet users cannot self-register
    secret_key: str = Field(..., min_length=1, description="Registration secret key")

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors: list[str] = []
        if not any(c.isupper() for c in v):
            errors.append("at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            errors.append("at least one digit")
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")
        return v


class UserLoginRequest(BaseModel):
    """Payload for POST /auth/login"""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Returned on successful authentication (login)."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RegisterResponse(BaseModel):
    """
    Returned on successful registration.
    Bundles the user profile + a ready-to-use JWT so the frontend can
    authenticate the user immediately without a second login round-trip.
    """

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: "UserPublicResponse"


class UserPublicResponse(BaseModel):
    """Safe user representation (no password hash)."""

    id: uuid.UUID
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors: list[str] = []
        if not any(c.isupper() for c in v):
            errors.append("at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            errors.append("at least one digit")
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")
        return v
