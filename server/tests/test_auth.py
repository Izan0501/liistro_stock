"""
tests/test_auth.py
Unit tests for the authentication endpoints.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient) -> None:
    """Full auth flow: register → login → /me."""
    # Register
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Rodrigo Liistro",
            "email": "rodrigo@liistro.com",
            "password": "SecurePass1",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "rodrigo@liistro.com"
    assert "hashed_password" not in data

    # Login
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "rodrigo@liistro.com", "password": "SecurePass1"},
    )
    assert resp.status_code == 200
    token_data = resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # /me
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "rodrigo@liistro.com"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    """Registering the same email twice returns 409."""
    payload = {
        "name": "Rodrigo Liistro",
        "email": "rodrigo@liistro.com",
        "password": "SecurePass1",
    }
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient) -> None:
    """Wrong password returns 401."""
    await client.post(
        "/api/v1/auth/register",
        json={"name": "R", "email": "r@r.com", "password": "SecurePass1"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "r@r.com", "password": "WrongPassword9"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient) -> None:
    """Accessing a protected route without a token returns 403."""
    resp = await client.get("/api/v1/clients")
    assert resp.status_code in (401, 403)
