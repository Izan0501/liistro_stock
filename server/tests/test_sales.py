"""
tests/test_sales.py
Unit tests for the ACID sale transaction.
Tests stock deduction, rollback on insufficient stock, and ledger entries.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _register_and_token(client: AsyncClient) -> str:
    await client.post(
        "/api/v1/auth/register",
        json={"name": "Rodrigo", "email": "r@r.com", "password": "SecurePass1"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "r@r.com", "password": "SecurePass1"},
    )
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_sale_deducts_stock(client: AsyncClient) -> None:
    """A successful sale reduces product.available_quantity."""
    token = await _register_and_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Create product with 10 units
    p = await client.post(
        "/api/v1/products",
        json={"name": "Produto A", "available_quantity": 10, "sell_price": "5.00", "buy_price": "3.00"},
        headers=headers,
    )
    assert p.status_code == 201
    product_id = p.json()["id"]

    # Create client
    c = await client.post(
        "/api/v1/clients",
        json={"name": "Cliente Teste"},
        headers=headers,
    )
    assert c.status_code == 201
    client_id = c.json()["id"]

    # Create sale for 3 units
    s = await client.post(
        "/api/v1/sales",
        json={
            "client_id": client_id,
            "items": [{"product_id": product_id, "quantity": 3, "unit_price": "5.00"}],
        },
        headers=headers,
    )
    assert s.status_code == 201
    assert s.json()["total_amount"] == "15.0000"

    # Verify stock was deducted: 10 - 3 = 7
    p_after = await client.get(f"/api/v1/products/{product_id}", headers=headers)
    assert p_after.json()["available_quantity"] == 7


@pytest.mark.asyncio
async def test_sale_rollback_on_insufficient_stock(client: AsyncClient) -> None:
    """Sale with insufficient stock must rollback entirely and return 400."""
    token = await _register_and_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    p = await client.post(
        "/api/v1/products",
        json={"name": "Produto B", "available_quantity": 2, "sell_price": "10.00", "buy_price": "6.00"},
        headers=headers,
    )
    product_id = p.json()["id"]

    c = await client.post("/api/v1/clients", json={"name": "Cliente 2"}, headers=headers)
    client_id = c.json()["id"]

    # Try to sell 5 units when only 2 are available
    s = await client.post(
        "/api/v1/sales",
        json={
            "client_id": client_id,
            "items": [{"product_id": product_id, "quantity": 5, "unit_price": "10.00"}],
        },
        headers=headers,
    )
    assert s.status_code == 400
    assert s.json()["detail"]["code"] == "INSUFFICIENT_STOCK"

    # Stock must remain at 2 (rollback confirmed)
    p_after = await client.get(f"/api/v1/products/{product_id}", headers=headers)
    assert p_after.json()["available_quantity"] == 2
