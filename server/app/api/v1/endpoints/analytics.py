"""
api/v1/endpoints/analytics.py
Analytics endpoints for charts and reporting.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import (
    IncomeVsExpensesResponse,
    StockLevelsResponse,
    FinancialChartResponse
)
from app.services import analytics_service

router = APIRouter()


@router.get(
    "/income_vs_expenses",
    response_model=IncomeVsExpensesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get total income (sales) vs total expenses (purchases) for Pie Chart",
)
async def get_income_vs_expenses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> IncomeVsExpensesResponse:
    return await analytics_service.get_income_vs_expenses(db)


@router.get(
    "/stock_levels",
    response_model=StockLevelsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get stock levels for all products for Bar Charting",
)
async def get_stock_levels(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StockLevelsResponse:
    return await analytics_service.get_stock_levels(db)


@router.get(
    "/chart-data",
    response_model=FinancialChartResponse,
    status_code=status.HTTP_200_OK,
    summary="Get formatted chart data and metrics for Recharts Financial Chart",
)
async def get_chart_data(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FinancialChartResponse:
    return await analytics_service.get_financial_chart_data(db)
