"""
api/v1/router.py
Central v1 API router — mounts all domain routers under /api/v1.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    clients,
    dashboard,
    finance,
    products,
    purchases,
    sales,
    stock_movements,
    suppliers,
    analytics,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(suppliers.router)
api_router.include_router(products.router)
api_router.include_router(stock_movements.router)
api_router.include_router(sales.router)
api_router.include_router(purchases.router)
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(finance.router)
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
