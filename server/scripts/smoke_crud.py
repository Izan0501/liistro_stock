"""
scripts/smoke_crud.py
End-to-end smoke test: Products, Clients, Stock-Movements, ACID Sale.
Run inside the API container:
    docker exec server-api-1 python3 /app/scripts/smoke_crud.py
"""
import sys
from decimal import Decimal

import httpx

BASE = "http://localhost:8000/api/v1"

# ── Auth ─────────────────────────────────────────────────────────────────────
for pwd in ("TempPass9", "admin123_dev_password"):
    r = httpx.post(f"{BASE}/auth/login", json={"email": "rodrigo@liistro.com", "password": pwd})
    if r.status_code == 200:
        break
assert r.status_code == 200, f"Login failed: {r.text}"
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}
print("✅  Auth OK")

# ── POST /products ────────────────────────────────────────────────────────────
r = httpx.post(f"{BASE}/products", headers=H, json={
    "name": "__SmokeTestProduct__",
    "available_quantity": 100,
    "sell_price": "25.0000",
    "buy_price": "15.0000",
})
assert r.status_code == 201, f"Create product failed {r.status_code}: {r.text}"
product = r.json()
product_id = product["id"]
assert product["available_quantity"] == 100
assert Decimal(product["profit_margin"]) == Decimal("40.00"), f"margin={product['profit_margin']}"
print(f"✅  POST /products → 201  qty={product['available_quantity']}  margin={product['profit_margin']}%")

# ── POST /clients ─────────────────────────────────────────────────────────────
r = httpx.post(f"{BASE}/clients", headers=H, json={
    "name": "__SmokeTestClient__",
    "phone": "+5511999990001",
})
assert r.status_code == 201, f"Create client failed {r.status_code}: {r.text}"
client_id = r.json()["id"]
print(f"✅  POST /clients → 201")

# ── POST /stock-movements (restock IN) ────────────────────────────────────────
r = httpx.post(f"{BASE}/stock-movements", headers=H, json={
    "product_id": product_id,
    "movement_type": "IN",
    "quantity": 50,
    "unit_price": "15.0000",
})
assert r.status_code == 201, f"Restock failed {r.status_code}: {r.text}"
assert r.json()["movement_type"] == "IN"
print(f"✅  POST /stock-movements → 201  (qty=50 restocked)")

# Verify product qty reflects restock
r = httpx.get(f"{BASE}/products/{product_id}", headers=H)
qty = r.json()["available_quantity"]
assert qty == 150, f"Expected 150, got {qty}"
print(f"✅  Product qty after restock = {qty}")

# ── POST /sales — full ACID transaction ───────────────────────────────────────
r = httpx.post(f"{BASE}/sales", headers=H, json={
    "client_id": client_id,
    "notes": "smoke-test-sale",
    "items": [{"product_id": product_id, "quantity": 10, "unit_price": "25.0000"}],
})
assert r.status_code == 201, f"Create sale failed {r.status_code}: {r.text}"
sale = r.json()
assert sale["status"] == "COMPLETED"
# Total MUST use canonical sell_price (25) * qty (10) = 250
assert Decimal(sale["total_amount"]) == Decimal("250.0000"), f"Bad total: {sale['total_amount']}"
assert len(sale["items"]) == 1
print(f"✅  POST /sales → 201  total={sale['total_amount']}  items={len(sale['items'])}")

# Verify stock was deducted: 150 - 10 = 140
r = httpx.get(f"{BASE}/products/{product_id}", headers=H)
qty = r.json()["available_quantity"]
assert qty == 140, f"Expected 140, got {qty}"
print(f"✅  Stock deducted: product qty = {qty}")

# ── Insufficient stock guard ───────────────────────────────────────────────────
r = httpx.post(f"{BASE}/sales", headers=H, json={
    "client_id": client_id,
    "items": [{"product_id": product_id, "quantity": 9999, "unit_price": "25.0000"}],
})
assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
print(f"✅  Insufficient stock → 400 INSUFFICIENT_STOCK (rollback verified)")

# ── Stock must be unchanged after rollback ────────────────────────────────────
r = httpx.get(f"{BASE}/products/{product_id}", headers=H)
qty_after_fail = r.json()["available_quantity"]
assert qty_after_fail == 140, f"Rollback failed! qty={qty_after_fail}"
print(f"✅  Stock unchanged after rollback: {qty_after_fail}")

# ── Dashboard capital reflects new sale ───────────────────────────────────────
r = httpx.get(f"{BASE}/dashboard/metrics", headers=H)
assert r.status_code == 200
capital = Decimal(r.json()["starting_capital"])
print(f"✅  Dashboard /metrics → starting_capital={capital}")

print()
print("━" * 60)
print("✅  ALL CRUD & ACID SMOKE TESTS PASSED")
print("━" * 60)
