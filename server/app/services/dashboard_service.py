"""
services/dashboard_service.py
Financial dashboard aggregation queries.
All aggregations run as single SQL queries to minimise round-trips
and deliver sub-50ms responses on indexed columns.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import case, extract, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.financial_config import FinancialConfig
from app.models.product import Product
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.dashboard import (
    DashboardMetricsResponse,
    DashboardSummaryResponse,
    FinancialConfigUpdateRequest,
    RevenueDataPoint,
    TopProduct,
)


async def _get_or_create_financial_config(db: AsyncSession) -> FinancialConfig:
    """Return the singleton FinancialConfig row, creating it if needed."""
    result = await db.execute(select(FinancialConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        import uuid
        config = FinancialConfig(id=uuid.uuid4(), initial_capital=Decimal("0.0000"))
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


async def get_dashboard_metrics(db: AsyncSession) -> DashboardMetricsResponse:
    """
    Compute and return core metrics for the dashboard.
    """
    config = await _get_or_create_financial_config(db)
    starting_capital = Decimal(str(config.initial_capital))

    total_products_count: int = await db.scalar(select(func.count(Product.id))) or 0
    active_clients: int = await db.scalar(select(func.count(Client.id))) or 0

    total_stock_valuation: Decimal = await db.scalar(
        select(
            func.coalesce(
                func.sum(Product.available_quantity * Product.buy_price), 0
            )
        )
    ) or Decimal("0")
    total_stock_valuation = Decimal(str(total_stock_valuation))

    return DashboardMetricsResponse(
        starting_capital=starting_capital,
        total_products_count=total_products_count,
        active_clients=active_clients,
        total_stock_valuation=total_stock_valuation,
    )


async def get_dashboard_summary(db: AsyncSession) -> DashboardSummaryResponse:
    """
    Compute all KPIs in as few SQL round-trips as possible.
    """
    # ── Financial Config ────────────────────────────────────────────────────
    config = await _get_or_create_financial_config(db)
    initial_capital = Decimal(str(config.initial_capital))

    # ── Total Sales Revenue ─────────────────────────────────────────────────
    total_revenue: Decimal = await db.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), 0)).where(
            Sale.status == SaleStatus.COMPLETED
        )
    ) or Decimal("0")
    total_revenue = Decimal(str(total_revenue))

    # ── Total Restock Expenses ──────────────────────────────────────────────
    # Restock expense = SUM(quantity * unit_price) for all IN movements
    total_expenses: Decimal = await db.scalar(
        select(
            func.coalesce(
                func.sum(StockMovement.quantity * StockMovement.unit_price), 0
            )
        ).where(StockMovement.movement_type == MovementType.IN)
    ) or Decimal("0")
    total_expenses = Decimal(str(total_expenses))

    # ── Net Capital ─────────────────────────────────────────────────────────
    net_capital = initial_capital + total_revenue - total_expenses

    # ── Counts ──────────────────────────────────────────────────────────────
    total_sales_count: int = await db.scalar(
        select(func.count(Sale.id)).where(Sale.status == SaleStatus.COMPLETED)
    ) or 0

    total_clients_count: int = await db.scalar(select(func.count(Client.id))) or 0
    total_products_count: int = await db.scalar(select(func.count(Product.id))) or 0
    low_stock_count: int = await db.scalar(
        select(func.count(Product.id)).where(Product.available_quantity <= 5)
    ) or 0

    # ── Monthly Revenue/Expense (last 12 months) ─────────────────────────────
    monthly_revenue_rows = await db.execute(
        select(
            func.to_char(Sale.sale_date, "YYYY-MM").label("period"),
            func.coalesce(func.sum(Sale.total_amount), 0).label("revenue"),
        )
        .where(
            Sale.status == SaleStatus.COMPLETED,
            Sale.sale_date >= text("NOW() - INTERVAL '12 months'"),
        )
        .group_by(text("period"))
        .order_by(text("period"))
    )
    monthly_revenue_map: dict[str, Decimal] = {
        row.period: Decimal(str(row.revenue))
        for row in monthly_revenue_rows
    }

    monthly_expense_rows = await db.execute(
        select(
            func.to_char(StockMovement.movement_date, "YYYY-MM").label("period"),
            func.coalesce(
                func.sum(StockMovement.quantity * StockMovement.unit_price), 0
            ).label("expenses"),
        )
        .where(
            StockMovement.movement_type == MovementType.IN,
            StockMovement.movement_date >= text("NOW() - INTERVAL '12 months'"),
        )
        .group_by(text("period"))
        .order_by(text("period"))
    )
    monthly_expense_map: dict[str, Decimal] = {
        row.period: Decimal(str(row.expenses))
        for row in monthly_expense_rows
    }

    all_periods = sorted(
        set(monthly_revenue_map.keys()) | set(monthly_expense_map.keys())
    )
    monthly_data: list[RevenueDataPoint] = [
        RevenueDataPoint(
            period=p,
            revenue=monthly_revenue_map.get(p, Decimal("0")),
            expenses=monthly_expense_map.get(p, Decimal("0")),
            profit=monthly_revenue_map.get(p, Decimal("0"))
            - monthly_expense_map.get(p, Decimal("0")),
        )
        for p in all_periods
    ]

    # ── Top Products (by quantity sold) ─────────────────────────────────────
    top_rows = await db.execute(
        select(
            SaleItem.product_id.label("product_id"),
            Product.name.label("product_name"),
            func.sum(SaleItem.quantity).label("total_quantity"),
            func.sum(SaleItem.quantity * SaleItem.unit_price).label("total_revenue"),
        )
        .join(Product, Product.id == SaleItem.product_id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.status == SaleStatus.COMPLETED)
        .group_by(SaleItem.product_id, Product.name)
        .order_by(text("total_quantity DESC"))
        .limit(10)
    )
    top_products = [
        TopProduct(
            product_id=str(row.product_id),
            product_name=row.product_name,
            total_quantity_sold=int(row.total_quantity),
            total_revenue=Decimal(str(row.total_revenue)),
        )
        for row in top_rows
    ]

    return DashboardSummaryResponse(
        initial_capital=initial_capital,
        total_sales_revenue=total_revenue,
        total_restock_expenses=total_expenses,
        net_capital=net_capital,
        total_sales_count=total_sales_count,
        total_clients_count=total_clients_count,
        total_products_count=total_products_count,
        low_stock_products_count=low_stock_count,
        monthly_revenue=monthly_data,
        top_products=top_products,
    )


async def update_initial_capital(
    db: AsyncSession, payload: FinancialConfigUpdateRequest
) -> FinancialConfig:
    config = await _get_or_create_financial_config(db)
    config.initial_capital = payload.initial_capital
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config
