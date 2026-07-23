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
  SQL statement inside a session.  Calling `db.begin()` on an already-started
  session raises InvalidRequestError.  The correct pattern is to drive the
  transaction via explicit await db.commit() / await db.rollback().

Steps executed inside a single BEGIN...COMMIT block:
  1. Validate client exists.
  2. Lock all product rows in PK-sorted order (prevents deadlocks).
  3. Validate sufficient stock for every line item (fail-fast).
  4. Compute total_amount using the server-side sell_price (not client input).
  5. Insert the Sale record.
  6. For each item:
       a. Insert SaleItem.
       b. Deduct product.available_quantity.
       c. Insert StockMovement (OUT) for audit trail.
  7. Update FinancialConfig.initial_capital += total_amount so the dashboard
     capital reflects confirmed revenue immediately.
  8. COMMIT — on any exception ROLLBACK the entire transaction.
"""

from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
        #    Protects against price-manipulation attacks from the client.
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
        # Flush to materialise sale.id so FK references below resolve
        await db.flush()

        # ── Step 6: Process each line item ─────────────────────────────────────
        for item in payload.items:
            product = locked_products[item.product_id]

            # 6a. SaleItem (store submitted unit_price for line-item display)
            sale_item = SaleItem(
                id=uuid.uuid4(),
                sale_id=sale.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,  # display price; total uses sell_price
            )
            db.add(sale_item)

            # 6b. Deduct inventory (already validated — safe to mutate)
            product.available_quantity -= item.quantity
            db.add(product)

            # 6c. Immutable audit ledger row (OUT)
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

        # ── Step 7: Update FinancialConfig capital (Step E per spec) ──────────
        #    Get-or-create the singleton row inside the same transaction so the
        #    capital increment is atomic with the sale itself.
        result = await db.execute(
            select(FinancialConfig).limit(1).with_for_update()
        )
        config = result.scalar_one_or_none()
        if config is None:
            config = FinancialConfig(
                id=uuid.uuid4(),
                initial_capital=total_amount,
            )
            db.add(config)
        else:
            config.initial_capital = (
                Decimal(str(config.initial_capital)) + total_amount
            )
            db.add(config)

        # ── Step 8: COMMIT ─────────────────────────────────────────────────────
        await db.commit()

    except Exception:
        await db.rollback()
        raise

    # ── Reload with eager-loaded items for the HTTP response ──────────────────
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.id == sale.id)
    )
    return result.scalar_one()


async def get_sale(db: AsyncSession, sale_id: uuid.UUID) -> Sale:
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    if not sale:
        raise NotFoundError(f"Sale {sale_id} not found.")
    return sale


async def list_sales(
    db: AsyncSession,
    client_id: uuid.UUID | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[int, list[Sale]]:
    base_q = select(Sale).options(selectinload(Sale.items))
    if client_id:
        base_q = base_q.where(Sale.client_id == client_id)

    count_q = (
        select(func.count()).select_from(
            select(Sale).where(Sale.client_id == client_id).subquery()
        )
        if client_id
        else select(func.count()).select_from(select(Sale).subquery())
    )
    total: int = await db.scalar(count_q) or 0

    result = await db.execute(
        base_q.order_by(Sale.sale_date.desc()).offset(offset).limit(limit)
    )
    items = list(result.scalars().all())
    return total, items
