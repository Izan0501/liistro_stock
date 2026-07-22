"""
schemas/dashboard.py
Pydantic v2 schemas for the financial dashboard aggregations.
"""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel


class RevenueDataPoint(BaseModel):
    """A single period data point for revenue/expense charts."""

    period: str          # e.g. "2025-07" or "2025-W28"
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
    """Core metrics: starting capital, products count, active clients, and stock valuation."""

    starting_capital: Decimal
    total_products_count: int
    active_clients: int
    total_stock_valuation: Decimal


class FinancialConfigUpdateRequest(BaseModel):
    initial_capital: Decimal = Decimal("0.0000")
