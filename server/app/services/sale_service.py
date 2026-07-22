"""
services/sale_service.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACID Sale Transaction — the most critical business operation in the system.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Guarantees (per the ACID spec):
  Atomicity  — All steps succeed or NONE commit (full rollback on any failure).
  Consistency — product.available_quantity never goes below zero.
  Isolation   — SELECT ... FOR UPDATE prevents concurrent sales from
                racing on the same product row.
  Durability  — PostgreSQL WAL ensures the committed transaction survives crashes.

Steps executed inside a single BEGIN...COMMIT block:
  1. Lock all product rows involved (sorted by id to prevent deadlocks).
  2. Validate sufficient stock for every item.
  3. Insert the Sale record.
  4. For each item:
       a. Insert SaleItem.
       b. Deduct product.available_quantity.
       c. Insert StockMovement (OUT) for audit trail.
  5. Commit — any exception triggers an automatic ROLLBACK.
"""

from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import InsufficientStockError, NotFoundError
from app.models.client import Client
from app.models.product import Product
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.sale import SaleCreateRequest, SaleResponse, SaleItemResponse


async def create_sale(
    db: AsyncSession, payload: SaleCreateRequest
) -> Sale:
    """
    Execute the full ACID sale transaction.

    All product rows are locked in PRIMARY KEY order (ascending UUID)
    before any mutation occurs. This canonical lock ordering prevents
    deadlocks when concurrent requests involve overlapping product sets.
    """
    async with db.begin():
        # ── Step 1: Validate client exists ──────────────────────────────────
        client = await db.get(Client, payload.client_id)
        if not client:
            raise NotFoundError(f"Client {payload.client_id} not found.")

        # ── Step 2: Lock ALL product rows (sorted to avoid deadlocks) ────────
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

        # ── Step 3: Stock validation (fail-fast before any writes) ───────────
        for item in payload.items:
            product = locked_products[item.product_id]
            if product.available_quantity < item.quantity:
                raise InsufficientStockError(
                    f"Insufficient stock for '{product.name}'. "
                    f"Requested: {item.quantity}, Available: {product.available_quantity}."
                )

        # ── Step 4: Compute total sale amount ────────────────────────────────
        total_amount = sum(
            Decimal(str(item.unit_price)) * item.quantity for item in payload.items
        )

        # ── Step 5: Insert Sale record ───────────────────────────────────────
        sale = Sale(
            id=uuid.uuid4(),
            client_id=payload.client_id,
            total_amount=total_amount,
            status=SaleStatus.COMPLETED,
            notes=payload.notes,
        )
        db.add(sale)
        # Flush to get sale.id available for FK references below
        await db.flush()

        # ── Step 6: Process each line item ───────────────────────────────────
        for item in payload.items:
            product = locked_products[item.product_id]

            # 6a. Insert SaleItem
            sale_item = SaleItem(
                id=uuid.uuid4(),
                sale_id=sale.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            db.add(sale_item)

            # 6b. Deduct inventory (already validated — safe)
            product.available_quantity -= item.quantity
            db.add(product)

            # 6c. Write audit ledger row (OUT)
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

        # db.begin() context manager commits here; any exception → ROLLBACK

    # ── Step 7: Reload with eager-loaded items for the response ─────────────
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

    total: int = await db.scalar(
        select(func.count()).select_from(
            select(Sale).where(Sale.client_id == client_id).subquery()
            if client_id
            else select(Sale).subquery()
        )
    ) or 0

    result = await db.execute(
        base_q.order_by(Sale.sale_date.desc()).offset(offset).limit(limit)
    )
    items = list(result.scalars().all())
    return total, items
