"""
services/product_service.py
Product CRUD and stock adjustment business logic.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.models.product import Product
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.product import ProductCreateRequest, ProductUpdateRequest, StockAdjustRequest


async def create_product(
    db: AsyncSession, payload: ProductCreateRequest
) -> Product:
    product = Product(
        id=uuid.uuid4(),
        name=payload.name,
        available_quantity=payload.available_quantity,
        sell_price=payload.sell_price,
        buy_price=payload.buy_price,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


async def get_product(db: AsyncSession, product_id: uuid.UUID) -> Product:
    product = await db.get(Product, product_id)
    if not product:
        raise NotFoundError(f"Product {product_id} not found.")
    return product


async def list_products(
    db: AsyncSession,
    search: str | None = None,
    low_stock_only: bool = False,
    offset: int = 0,
    limit: int = 50,
) -> tuple[int, list[Product]]:
    base_q = select(Product)
    if search:
        pattern = f"%{search.lower()}%"
        base_q = base_q.where(func.lower(Product.name).like(pattern))
    if low_stock_only:
        base_q = base_q.where(Product.available_quantity <= 5)

    total: int = await db.scalar(
        select(func.count()).select_from(base_q.subquery())
    ) or 0

    result = await db.execute(
        base_q.order_by(Product.name).offset(offset).limit(limit)
    )
    items = list(result.scalars().all())
    return total, items


async def update_product(
    db: AsyncSession, product_id: uuid.UUID, payload: ProductUpdateRequest
) -> Product:
    product = await get_product(db, product_id)
    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


async def adjust_stock(
    db: AsyncSession, product_id: uuid.UUID, payload: StockAdjustRequest
) -> Product:
    """
    Manually adjust stock quantity (e.g. write-offs, corrections).
    Creates a StockMovement record for auditability.
    Raises BadRequestError if adjustment would send quantity below zero.
    """
    try:
        product = await db.get(Product, product_id, with_for_update=True)
        if not product:
            raise NotFoundError(f"Product {product_id} not found.")

        new_qty = product.available_quantity + payload.quantity_delta
        if new_qty < 0:
            raise BadRequestError(
                f"Stock adjustment would result in negative quantity "
                f"({product.available_quantity} + {payload.quantity_delta} = {new_qty})."
            )

        product.available_quantity = new_qty
        db.add(product)

        # Audit trail
        movement = StockMovement(
            id=uuid.uuid4(),
            product_id=product_id,
            movement_type=MovementType.IN if payload.quantity_delta > 0 else MovementType.OUT,
            quantity=abs(payload.quantity_delta),
            unit_price=product.buy_price,
        )
        db.add(movement)

        await db.commit()

    except Exception:
        await db.rollback()
        raise

    await db.refresh(product)
    return product


async def delete_product(db: AsyncSession, product_id: uuid.UUID) -> None:
    product = await get_product(db, product_id)
    await db.delete(product)
    await db.commit()
