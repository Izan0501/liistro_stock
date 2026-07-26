"""
schemas/dashboard.py
Pydantic v2 schemas for the financial dashboard aggregations.
"""

from __future__ import annotations

from decimal import Decimal
from datetime import date

from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Literal


class RevenueDataPoint(BaseModel):
    """A single period data point for revenue/expense charts (monthly summary)."""

    period: str          # e.g. "2025-07"
    revenue: Decimal
    expenses: Decimal
    profit: Decimal


class TopProduct(BaseModel):
    """Most sold products by quantity."""

    product_id: str
    product_name: str
    total_quantity_sold: int
    total_revenue: Decimal


class DashboardSummaryResponse(BaseModel):
    """Main dashboard KPI aggregation."""

    # Capital & net worth
    initial_capital: Decimal
    total_sales_revenue: Decimal
    total_restock_expenses: Decimal
    net_capital: Decimal                  # initial + revenue - expenses

    # Transaction counts
    total_sales_count: int
    total_clients_count: int
    total_products_count: int
    low_stock_products_count: int         # products with qty <= 5

    # Trend data (last 12 months)
    monthly_revenue: list[RevenueDataPoint]

    # Top performers
    top_products: list[TopProduct]


class DashboardMetricsResponse(BaseModel):
    """
    Core metrics returned by GET /dashboard/metrics.
    Refactored for Inventory & Stock Management focus.
    """
    sales_revenue: Decimal
    total_clients: int
    total_products_stored: int
    total_deliveries: int

class RecentActivity(BaseModel):
    id: str
    entity_type: Literal["sale", "purchase", "restock"]
    title: str          # Primary display field — e.g. "Venta a Juan Pérez"
    description: str    # Alias/secondary — same value, kept for backward compat
    entity_name: str    # Raw client/supplier name for filtering/display
    amount: Decimal
    date: datetime
    notes: str | None = None

class IncomeVsExpensesResponse(BaseModel):
    total_income: Decimal
    total_expenses: Decimal

class FinancialChartMetrics(BaseModel):
    currentBalance: Decimal
    todaysPnL: Decimal
    pnlPercentage: float
    highValue: Decimal
    lowValue: Decimal

class FinancialChartDataPoint(BaseModel):
    date: str
    value: Decimal

class FinancialChartResponse(BaseModel):
    metrics: FinancialChartMetrics
    chartData: list[FinancialChartDataPoint]

class StockLevelItem(BaseModel):
    product_id: str
    product_name: str
    current_stock: int
    minimum_required: int

class StockLevelsResponse(BaseModel):
    items: list[StockLevelItem]


class ChartDataPoint(BaseModel):
    """One calendar-day data point consumed by the Recharts frontend."""

    date: str           # "YYYY-MM-DD"
    income: Decimal     # SUM(sale.total_amount) on that day
    expense: Decimal    # SUM(restock IN cost) on that day


class CapitalResponse(BaseModel):
    """Current capital state returned by GET /finance/capital."""

    initial_capital: Decimal
    updated_at: str     # ISO-8601 string


class CapitalAdjustRequest(BaseModel):
    """
    Payload for POST /finance/capital/adjust.
    Manually inject or withdraw liquidity without creating a sale/restock.
    """

    amount: Decimal = Field(..., gt=Decimal("0"), decimal_places=4)
    operation: Literal["add", "subtract"]
    reason: str = Field(..., min_length=3, max_length=255)


class FinancialConfigUpdateRequest(BaseModel):
    initial_capital: Decimal = Decimal("0.0000")
