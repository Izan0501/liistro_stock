"""
services/stock_service.py
Inventory ledger service — handles restock (IN) movements.
OUT movements are automatically created by the sale_service ACID transaction.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestError, NotFoundError
from app.models.product import Product
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.stock_movement import StockMovementCreateRequest


async def create_restock(
    db: AsyncSession, payload: StockMovementCreateRequest
) -> StockMovement:
    """
    Record a restock (IN) movement.
    Atomically increments product.available_quantity and writes the ledger row.
    """
    if payload.movement_type != MovementType.IN:
        raise BadRequestError(
            "Only IN movements are allowed via this endpoint. "
            "OUT movements are created automatically when a sale is registered."
        )

    try:
        product = await db.get(Product, payload.product_id, with_for_update=True)
        if not product:
            raise NotFoundError(f"Product {payload.product_id} not found.")

        if payload.supplier_id:
            from app.models.supplier import Supplier  # avoid circular at top-level

            supplier = await db.get(Supplier, payload.supplier_id)
            if not supplier:
                raise NotFoundError(f"Supplier {payload.supplier_id} not found.")

        product.available_quantity += payload.quantity
        db.add(product)

        movement = StockMovement(
            id=uuid.uuid4(),
            product_id=payload.product_id,
            supplier_id=payload.supplier_id,
            movement_type=MovementType.IN,
            quantity=payload.quantity,
            unit_price=payload.unit_price,
        )
        db.add(movement)

        await db.commit()

    except Exception:
        await db.rollback()
        raise

    await db.refresh(movement)
    return movement


async def list_movements(
    db: AsyncSession,
    product_id: uuid.UUID | None = None,
    movement_type: MovementType | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[int, list[StockMovement]]:
    base_q = select(StockMovement)
    if product_id:
        base_q = base_q.where(StockMovement.product_id == product_id)
    if movement_type:
        base_q = base_q.where(StockMovement.movement_type == movement_type)

    total: int = await db.scalar(
        select(func.count()).select_from(base_q.subquery())
    ) or 0

    result = await db.execute(
        base_q.order_by(StockMovement.movement_date.desc()).offset(offset).limit(limit)
    )
    items = list(result.scalars().all())
    return total, items
