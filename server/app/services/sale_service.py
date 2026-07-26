"""
services/sale_service.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACID Sale Transaction — the most critical business operation in the system.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Guarantees (per the ACID spec):
  Atomicity  — All steps succeed or NONE commit (try/except → rollback).
  Consistency — product.available_quantity never goes below zero; capital is
                updated atomically in the same transaction as the sale.
  Isolation   — SELECT ... FOR UPDATE prevents concurrent sales from racing on
                the same product row.
  Durability  — PostgreSQL WAL ensures committed transactions survive crashes.

Why explicit try/except instead of `async with db.begin()`:
  SQLAlchemy 2.0 with autocommit=False *autobegins* a transaction on the first
  SQL statement inside a session. Calling `db.begin()` on an already-started
  session raises InvalidRequestError. The correct pattern is to drive the
  transaction via explicit await db.commit() / await db.rollback().
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.exceptions import InsufficientStockError, NotFoundError
from app.models.client import Client
from app.models.financial_config import FinancialConfig
from app.models.product import Product
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.sale import SaleCreateRequest, SaleItemResponse, SaleResponse


async def create_sale(
    db: AsyncSession, payload: SaleCreateRequest
) -> Sale:
    """
    Execute the full ACID sale transaction.

    Pricing note:
        unit_price from the request is IGNORED for the total calculation.
        The canonical sell_price from the locked Product row is used instead,
        preventing clients from submitting manipulated prices.
        The submitted unit_price is still persisted on SaleItem for line-item
        display (it may differ from sell_price after discounts were applied),
        but total_amount is always computed from product.sell_price.

    Deadlock prevention:
        All product rows are locked in ascending UUID string order before any
        write occurs. This canonical ordering ensures two concurrent transactions
        covering overlapping product sets always acquire locks in the same
        sequence, eliminating the circular-wait condition.
    """
    try:
        # ── Step 1: Validate client exists ───────────────────────────────────
        client = await db.get(Client, payload.client_id)
        if not client:
            raise NotFoundError(f"Client {payload.client_id} not found.")

        # ── Step 2: Lock ALL product rows (sorted to avoid deadlocks) ─────────
        product_ids_sorted = sorted(
            [item.product_id for item in payload.items],
            key=lambda u: str(u),
        )
        locked_products: dict[uuid.UUID, Product] = {}
        for pid in product_ids_sorted:
            product = await db.get(Product, pid, with_for_update=True)
            if not product:
                raise NotFoundError(f"Product {pid} not found.")
            locked_products[pid] = product

        # ── Step 3: Stock validation (fail-fast, before any writes) ───────────
        for item in payload.items:
            product = locked_products[item.product_id]
            if product.available_quantity < item.quantity:
                raise InsufficientStockError(
                    f"Insufficient stock for '{product.name}'. "
                    f"Requested: {item.quantity}, "
                    f"Available: {product.available_quantity}."
                )

        # ── Step 4: Compute total using canonical server-side sell_price ───────
        total_amount = sum(
            Decimal(str(locked_products[item.product_id].sell_price)) * item.quantity
            for item in payload.items
        )

        # ── Step 5: Insert Sale record ─────────────────────────────────────────
        sale = Sale(
            id=uuid.uuid4(),
            client_id=payload.client_id,
            total_amount=total_amount,
            status=SaleStatus.COMPLETED,
            notes=payload.notes,
        )
        db.add(sale)
        await db.flush()

        # ── Step 6: Process each line item ─────────────────────────────────────
        for item in payload.items:
            product = locked_products[item.product_id]

            sale_item = SaleItem(
                id=uuid.uuid4(),
                sale_id=sale.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            db.add(sale_item)

            product.available_quantity -= item.quantity
            db.add(product)

            movement = StockMovement(
                id=uuid.uuid4(),
                product_id=item.product_id,
                supplier_id=None,
                sale_id=sale.id,
                movement_type=MovementType.OUT,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            db.add(movement)

        # ── Step 7: Update FinancialConfig capital ─────────────────────────────
        result = await db.execute(
            select(FinancialConfig).limit(1).with_for_update()
        )
        config = result.scalar_one_or_none()
        if config is None:
            config = FinancialConfig(id=uuid.uuid4(), initial_capital=total_amount)
            db.add(config)
        else:
            config.initial_capital = Decimal(str(config.initial_capital)) + total_amount
            db.add(config)

        # ── Step 8: COMMIT ─────────────────────────────────────────────────────
        await db.commit()

    except Exception:
        await db.rollback()
        raise

    # ── Reload with eager-loaded items for the HTTP response ──────────────────
    result = await db.execute(
        select(Sale)
        .options(
            joinedload(Sale.client),
            selectinload(Sale.items).joinedload(SaleItem.product)
        )
        .where(Sale.id == sale.id)
    )
    return result.scalar_one()


async def get_sale(db: AsyncSession, sale_id: uuid.UUID) -> Sale:
    result = await db.execute(
        select(Sale)
        .options(
            joinedload(Sale.client),
            selectinload(Sale.items).joinedload(SaleItem.product)
        )
        .where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    if not sale:
        raise NotFoundError(f"Sale {sale_id} not found.")
    return sale


async def list_sales(
    db: AsyncSession,
    client_id: uuid.UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[int, list[SaleResponse]]:
    """
    Return paginated sales with client_name and total_items pre-computed.

    Eagerly loads client and items (along with product) to prevent N+1 queries.
    """
    base_q = (
        select(Sale)
        .options(
            joinedload(Sale.client),
            selectinload(Sale.items).joinedload(SaleItem.product)
        )
    )

    # ── Filters ────────────────────────────────────────────────────────────────
    if client_id:
        base_q = base_q.where(Sale.client_id == client_id)
    if start_date:
        start_dt = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=timezone.utc)
        base_q = base_q.where(Sale.sale_date >= start_dt)
    if end_date:
        end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc)
        base_q = base_q.where(Sale.sale_date <= end_dt)

    # ── Count ──────────────────────────────────────────────────────────────────
    count_base = select(Sale)
    if client_id:
        count_base = count_base.where(Sale.client_id == client_id)
    if start_date:
        start_dt = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=timezone.utc)
        count_base = count_base.where(Sale.sale_date >= start_dt)
    if end_date:
        end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc)
        count_base = count_base.where(Sale.sale_date <= end_dt)
    
    total: int = await db.scalar(
        select(func.count()).select_from(count_base.subquery())
    ) or 0

    # ── Paginated results ──────────────────────────────────────────────────────
    rows = await db.execute(
        base_q.order_by(Sale.sale_date.desc()).offset(offset).limit(limit)
    )

    sales = list(rows.scalars().all())
    responses: list[SaleResponse] = []
    
    for sale_obj in sales:
        c_name = sale_obj.client.name if getattr(sale_obj, "client", None) else None
        t_items = sum(i.quantity for i in sale_obj.items) if getattr(sale_obj, "items", None) else 0

        responses.append(
            SaleResponse(
                id=sale_obj.id,
                client_id=sale_obj.client_id,
                client_name=c_name,
                total_amount=Decimal(str(sale_obj.total_amount)),
                total_items=t_items,
                status=sale_obj.status,
                notes=sale_obj.notes,
                sale_date=sale_obj.sale_date,
                items=[SaleItemResponse.from_orm(i) for i in sale_obj.items],
            )
        )

    return total, responses
