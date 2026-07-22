"""
api/v1/endpoints/dashboard.py
Financial dashboard endpoints — serves aggregated KPIs and chart data.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import (
    DashboardMetricsResponse,
    DashboardSummaryResponse,
    FinancialConfigUpdateRequest,
)
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/metrics",
    response_model=DashboardMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get core dashboard metrics",
)
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardMetricsResponse:
    """
    Returns core metrics for the dashboard:
    - starting_capital
    - total_products_count
    - active_clients
    - total_stock_valuation
    """
    return await dashboard_service.get_dashboard_metrics(db)


@router.get(
    "",
    response_model=DashboardSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get full dashboard KPI summary",
)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardSummaryResponse:
    """
    Returns:
    - Net capital (initial + revenue - expenses)
    - Monthly revenue/expense trend (last 12 months)
    - Top 10 products by quantity sold
    - Low stock count, total clients, sales count
    """
    return await dashboard_service.get_dashboard_summary(db)


@router.patch(
    "/capital",
    status_code=status.HTTP_200_OK,
    summary="Update initial business capital",
)
async def update_capital(
    payload: FinancialConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    config = await dashboard_service.update_initial_capital(db, payload)
    return {"initial_capital": str(config.initial_capital)}
