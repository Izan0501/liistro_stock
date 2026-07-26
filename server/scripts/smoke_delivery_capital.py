"""
scripts/smoke_delivery_capital.py
Smoke test for:
  1. GET /sales with date filters (delivery history)
  2. GET /finance/capital
  3. POST /finance/capital/adjust (add + subtract + negative guard)
  4. GET /dashboard/metrics with and without date ranges (chart_data)
"""
import sys
from datetime import date, timedelta
from decimal import Decimal

import httpx

BASE = "http://localhost:8000/api/v1"

# ── Auth ─────────────────────────────────────────────────────────────────────
for pwd in ("TempPass9", "admin123_dev_password"):
    r = httpx.post(f"{BASE}/auth/login", json={"email": "rodrigo@liistro.com", "password": pwd})
    if r.status_code == 200:
        break
assert r.status_code == 200, f"Login failed: {r.text}"
H = {"Authorization": f"Bearer {r.json()['access_token']}"}
print("✅  Auth OK")

# ── 1. GET /sales — no filters ────────────────────────────────────────────────
r = httpx.get(f"{BASE}/sales", headers=H)
assert r.status_code == 200, f"List sales failed: {r.text}"
data = r.json()
assert "total" in data and "items" in data
print(f"✅  GET /sales → 200  total={data['total']}")
if data["items"]:
    first = data["items"][0]
    assert "client_name" in first, "Missing client_name"
    assert "total_items" in first, "Missing total_items"
    print(f"     First sale: client_name={first['client_name']!r}  total_items={first['total_items']}  total_amount={first['total_amount']}")

# ── 2. GET /sales — future date filter (should return 0) ──────────────────────
future = (date.today() + timedelta(days=365)).isoformat()
r = httpx.get(f"{BASE}/sales?start_date={future}&end_date={future}", headers=H)
assert r.status_code == 200, f"Date-filtered sales failed: {r.text}"
assert r.json()["total"] == 0, f"Expected 0 future sales, got {r.json()['total']}"
print(f"✅  GET /sales?start_date={future} → 0 results (correct)")

# ── 3. GET /finance/capital ───────────────────────────────────────────────────
r = httpx.get(f"{BASE}/finance/capital", headers=H)
assert r.status_code == 200, f"GET capital failed: {r.text}"
cap = r.json()
assert "initial_capital" in cap and "updated_at" in cap
original_capital = Decimal(cap["initial_capital"])
print(f"✅  GET /finance/capital → 200  capital={original_capital}")

# ── 4. POST /finance/capital/adjust — add ────────────────────────────────────
r = httpx.post(f"{BASE}/finance/capital/adjust", headers=H, json={
    "amount": "1000.0000",
    "operation": "add",
    "reason": "Smoke test capital injection",
})
assert r.status_code == 200, f"Capital add failed: {r.text}"
after_add = Decimal(r.json()["initial_capital"])
assert after_add == original_capital + Decimal("1000.0000"), f"Expected {original_capital + 1000}, got {after_add}"
print(f"✅  POST /finance/capital/adjust (add 1000) → capital={after_add}")

# ── 5. POST /finance/capital/adjust — subtract ───────────────────────────────
r = httpx.post(f"{BASE}/finance/capital/adjust", headers=H, json={
    "amount": "1000.0000",
    "operation": "subtract",
    "reason": "Smoke test capital reversal",
})
assert r.status_code == 200, f"Capital subtract failed: {r.text}"
after_sub = Decimal(r.json()["initial_capital"])
assert after_sub == original_capital, f"Expected {original_capital}, got {after_sub}"
print(f"✅  POST /finance/capital/adjust (subtract 1000) → capital={after_sub}")

# ── 6. POST /finance/capital/adjust — negative guard ─────────────────────────
r = httpx.post(f"{BASE}/finance/capital/adjust", headers=H, json={
    "amount": "999999999.0000",
    "operation": "subtract",
    "reason": "Should fail",
})
assert r.status_code == 400, f"Expected 400 for over-subtract, got {r.status_code}: {r.text}"
print(f"✅  Capital subtract overflow → 400 BAD_REQUEST (guard works)")

# ── 7. GET /dashboard/metrics — no params (current month) ────────────────────
r = httpx.get(f"{BASE}/dashboard/metrics", headers=H)
assert r.status_code == 200, f"Dashboard metrics failed: {r.text}"
m = r.json()
required_fields = ["starting_capital", "total_products_count", "period_start", "period_end",
                   "period_income", "period_sales_count", "active_clients",
                   "total_stock_valuation", "chart_data"]
for f in required_fields:
    assert f in m, f"Missing field: {f}"
assert isinstance(m["chart_data"], list)
print(f"✅  GET /dashboard/metrics → 200")
print(f"     period: {m['period_start']} → {m['period_end']}")
print(f"     period_income={m['period_income']}  period_sales_count={m['period_sales_count']}")
print(f"     active_clients={m['active_clients']}  chart_data_points={len(m['chart_data'])}")
if m["chart_data"]:
    print(f"     sample chart point: {m['chart_data'][0]}")

# ── 8. GET /dashboard/metrics — explicit date range ────────────────────────────
today = date.today().isoformat()
r = httpx.get(f"{BASE}/dashboard/metrics?start_date={today}&end_date={today}", headers=H)
assert r.status_code == 200, f"Date-range metrics failed: {r.text}"
m2 = r.json()
assert m2["period_start"] == today and m2["period_end"] == today
print(f"✅  GET /dashboard/metrics?start_date={today} → period matches")

print()
print("━" * 60)
print("✅  ALL DELIVERY HISTORY & CAPITAL MANAGEMENT TESTS PASSED")
print("━" * 60)
