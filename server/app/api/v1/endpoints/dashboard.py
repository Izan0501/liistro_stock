"""
api/v1/endpoints/dashboard.py
Dashboard endpoints — revamped for Inventory & Stock Management focus.
"""

from __future__ import annotations

from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import (
    DashboardMetricsResponse,
    RecentActivity,
)
from app.services import analytics_service

router = APIRouter()


@router.get(
    "/metrics",
    response_model=DashboardMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get 4 absolute KPIs for the dashboard",
)
async def get_dashboard_metrics(
    start_date: date | None = Query(None, description="ISO 8601 start date (inclusive)"),
    end_date: date | None = Query(None, description="ISO 8601 end date (inclusive)"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardMetricsResponse:
    """
    Returns exactly:
    - sales_revenue: Total amount from sales.
    - total_clients: Count of active clients.
    - total_products_stored: The absolute sum of all available_quantity across all products.
    - total_deliveries: Count of total sales/deliveries made.
    """
    return await analytics_service.get_dashboard_metrics(db, start_date, end_date)


@router.get(
    "/recent-activity",
    response_model=list[RecentActivity],
    status_code=status.HTTP_200_OK,
    summary="Get 10 most recent activities (Sales and Purchases)",
)
async def get_recent_activity(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[RecentActivity]:
    """
    Returns a unified list sorted by timestamp descending of latest sales and purchases.
    """
    return await analytics_service.get_recent_activity(db)
