"""
services/analytics_service.py
Aggregation queries for analytics and dashboard revamp.
"""
from __future__ import annotations

from decimal import Decimal
from datetime import date, datetime, timezone, timedelta

from sqlalchemy import func, select, distinct, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.financial_config import FinancialConfig
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.sale import Sale, SaleStatus
from app.models.purchase import Purchase, PurchaseStatus
from app.schemas.dashboard import (
    DashboardMetricsResponse,
    RecentActivity,
    IncomeVsExpensesResponse,
    StockLevelsResponse,
    StockLevelItem,
    FinancialChartResponse,
    FinancialChartMetrics,
    FinancialChartDataPoint
)

async def get_dashboard_metrics(
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None
) -> DashboardMetricsResponse:
    sales_q = select(func.coalesce(func.sum(Sale.total_amount), 0)).where(Sale.status == SaleStatus.COMPLETED)
    clients_q = select(func.count(Client.id))
    deliveries_q = select(func.count(Sale.id)).where(Sale.status == SaleStatus.COMPLETED)
    
    if start_date or end_date:
        clients_q = select(func.count(distinct(Sale.client_id))).where(Sale.status == SaleStatus.COMPLETED)
        
        if start_date:
            start_dt = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=timezone.utc)
            sales_q = sales_q.where(Sale.sale_date >= start_dt)
            clients_q = clients_q.where(Sale.sale_date >= start_dt)
            deliveries_q = deliveries_q.where(Sale.sale_date >= start_dt)
            
        if end_date:
            end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc)
            sales_q = sales_q.where(Sale.sale_date <= end_dt)
            clients_q = clients_q.where(Sale.sale_date <= end_dt)
            deliveries_q = deliveries_q.where(Sale.sale_date <= end_dt)

    sales_revenue: Decimal = await db.scalar(sales_q) or Decimal("0")
    total_clients: int = await db.scalar(clients_q) or 0
    total_deliveries: int = await db.scalar(deliveries_q) or 0
    
    # Products stored is always absolute across the entire inventory
    total_products_stored: int = await db.scalar(
        select(func.coalesce(func.sum(Product.available_quantity), 0))
    ) or 0
    
    return DashboardMetricsResponse(
        sales_revenue=Decimal(str(sales_revenue)),
        total_clients=total_clients,
        total_products_stored=total_products_stored,
        total_deliveries=total_deliveries
    )


async def get_recent_activity(db: AsyncSession) -> list[RecentActivity]:
    """
    Returns unified, enriched list of last 10 transactions.
    Uses two separate queries + Python-level merge to avoid UNION type-casting
    issues and to carry richer metadata (entity_name, notes, title).
    """
    # ── Sales ─────────────────────────────────────────────────────────────────
    sales_rows = await db.execute(
        select(
            Sale.id,
            func.coalesce(Client.name, "Mostrador").label("client_name"),
            Sale.total_amount,
            Sale.sale_date,
            Sale.notes,
        )
        .outerjoin(Client, Client.id == Sale.client_id)
        .where(Sale.status == SaleStatus.COMPLETED)
        .order_by(Sale.sale_date.desc())
        .limit(10)
    )

    # ── Purchases ─────────────────────────────────────────────────────────────
    purchases_rows = await db.execute(
        select(
            Purchase.id,
            func.coalesce(Supplier.name, "Sin Proveedor").label("supplier_name"),
            Purchase.total_amount,
            Purchase.purchase_date,
            Purchase.notes,
        )
        .outerjoin(Supplier, Supplier.id == Purchase.supplier_id)
        .where(Purchase.status == PurchaseStatus.COMPLETED)
        .order_by(Purchase.purchase_date.desc())
        .limit(10)
    )

    activities: list[RecentActivity] = []

    for row in sales_rows:
        entity_name = row.client_name
        title = f"Venta a {entity_name}"
        activities.append(RecentActivity(
            id=str(row.id),
            entity_type="sale",
            title=title,
            description=title,
            entity_name=entity_name,
            amount=Decimal(str(row.total_amount)),
            date=row.sale_date,
            notes=row.notes or None,
        ))

    for row in purchases_rows:
        entity_name = row.supplier_name
        title = f"Restock - {entity_name}"
        activities.append(RecentActivity(
            id=str(row.id),
            entity_type="purchase",
            title=title,
            description=title,
            entity_name=entity_name,
            amount=Decimal(str(row.total_amount)),
            date=row.purchase_date,
            notes=row.notes or None,
        ))

    # Merge and return the 10 most recent across both types
    activities.sort(key=lambda a: a.date, reverse=True)
    return activities[:10]


async def get_income_vs_expenses(db: AsyncSession) -> IncomeVsExpensesResponse:
    total_income: Decimal = await db.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), 0)).where(Sale.status == SaleStatus.COMPLETED)
    ) or Decimal("0")
    
    total_expenses: Decimal = await db.scalar(
        select(func.coalesce(func.sum(Purchase.total_amount), 0)).where(Purchase.status == PurchaseStatus.COMPLETED)
    ) or Decimal("0")
    
    return IncomeVsExpensesResponse(
        total_income=Decimal(str(total_income)),
        total_expenses=Decimal(str(total_expenses))
    )


async def get_stock_levels(db: AsyncSession) -> StockLevelsResponse:
    result = await db.execute(
        select(Product.id, Product.name, Product.available_quantity)
        .order_by(Product.name.asc())
    )
    items = []
    for row in result:
        # Assuming minimum required is 5 for all products if not dynamically stored in Product
        items.append(StockLevelItem(
            product_id=str(row.id),
            product_name=row.name,
            current_stock=row.available_quantity,
            minimum_required=5
        ))
    return StockLevelsResponse(items=items)


async def get_financial_chart_data(db: AsyncSession) -> FinancialChartResponse:
    now_utc = datetime.now(timezone.utc)
    today_start = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)
    yesterday_start = today_start - timedelta(days=1)
    fourteen_days_ago = today_start - timedelta(days=13)

    config = await db.scalar(select(FinancialConfig).limit(1))
    current_balance = Decimal(str(config.initial_capital)) if config else Decimal("0")

    todays_pnl_val = await db.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), 0))
        .where(Sale.status == SaleStatus.COMPLETED, Sale.sale_date >= today_start)
    ) or Decimal("0")

    yesterdays_pnl_val = await db.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), 0))
        .where(
            Sale.status == SaleStatus.COMPLETED, 
            Sale.sale_date >= yesterday_start, 
            Sale.sale_date < today_start
        )
    ) or Decimal("0")

    if yesterdays_pnl_val > 0:
        pnl_percentage = float((todays_pnl_val - yesterdays_pnl_val) / yesterdays_pnl_val * 100)
    else:
        pnl_percentage = 100.0 if todays_pnl_val > 0 else 0.0

    chart_query = (
        select(
            cast(Sale.sale_date, Date).label("day"),
            func.coalesce(func.sum(Sale.total_amount), 0).label("value")
        )
        .where(
            Sale.status == SaleStatus.COMPLETED,
            Sale.sale_date >= fourteen_days_ago
        )
        .group_by(cast(Sale.sale_date, Date))
        .order_by(cast(Sale.sale_date, Date))
    )
    
    rows = await db.execute(chart_query)
    
    db_values = {}
    for row in rows:
        db_values[row.day] = Decimal(str(row.value))
        
    chart_data = []
    high_value = Decimal("0")
    low_value = None

    for i in range(14):
        current_day = (fourteen_days_ago + timedelta(days=i)).date()
        val = db_values.get(current_day, Decimal("0"))
        
        # Output format strictly "DD MMM" e.g. "19 Jul"
        date_str = f"{current_day.day:02d} {current_day.strftime('%b')}"
        chart_data.append(FinancialChartDataPoint(date=date_str, value=val))
        
        if val > high_value:
            high_value = val
        if low_value is None or val < low_value:
            low_value = val

    if low_value is None:
        low_value = Decimal("0")

    return FinancialChartResponse(
        metrics=FinancialChartMetrics(
            currentBalance=current_balance,
            todaysPnL=todays_pnl_val,
            pnlPercentage=round(pnl_percentage, 2),
            highValue=high_value,
            lowValue=low_value
        ),
        chartData=chart_data
    )

