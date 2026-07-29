"""
services/product_service.py
Product CRUD and stock adjustment business logic.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

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
        category=payload.category,
        supplier_id=payload.supplier_id,
        available_quantity=payload.available_quantity,
        sell_price=payload.sell_price,
        buy_price=payload.buy_price,
    )
    db.add(product)

    if payload.available_quantity > 0:
        from app.models.purchase import Purchase, PurchaseItem, PurchaseStatus
        
        purchase = Purchase(
            id=uuid.uuid4(),
            supplier_id=payload.supplier_id,
            total_amount=payload.buy_price * payload.available_quantity,
            status=PurchaseStatus.COMPLETED,
            notes="Initial stock injection upon product creation"
        )
        db.add(purchase)
        
        purchase_item = PurchaseItem(
            id=uuid.uuid4(),
            purchase_id=purchase.id,
            product_id=product.id,
            quantity=payload.available_quantity,
            unit_price=payload.buy_price
        )
        db.add(purchase_item)

        movement = StockMovement(
            id=uuid.uuid4(),
            product_id=product.id,
            supplier_id=payload.supplier_id,
            purchase_id=purchase.id,
            movement_type=MovementType.IN,
            quantity=payload.available_quantity,
            unit_price=payload.buy_price,
        )
        db.add(movement)
    elif payload.available_quantity > 0:
        movement = StockMovement(
            id=uuid.uuid4(),
            product_id=product.id,
            movement_type=MovementType.IN,
            quantity=payload.available_quantity,
            unit_price=payload.buy_price,
        )
        db.add(movement)

    await db.commit()
    return await get_product(db, product.id)


async def get_product(db: AsyncSession, product_id: uuid.UUID) -> Product:
    result = await db.execute(
        select(Product)
        .options(joinedload(Product.supplier))
        .where(Product.id == product_id)
        .execution_options(populate_existing=True)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise NotFoundError(f"Product {product_id} not found.")
    return product


async def get_categories(db: AsyncSession) -> list[str]:
    result = await db.execute(
        select(Product.category).distinct().where(Product.category.isnot(None), Product.category != "").order_by(Product.category)
    )
    return list(result.scalars().all())


async def list_products(
    db: AsyncSession,
    search: str | None = None,
    low_stock_only: bool = False,
    offset: int = 0,
    limit: int = 50,
) -> tuple[int, list[Product]]:
    base_q = select(Product).options(joinedload(Product.supplier))
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
    # Strictly exclude stock mutations — use adjust_stock for inventory changes
    update_data = payload.model_dump(exclude_none=True)
    update_data.pop("available_quantity", None)
    for field, value in update_data.items():
        setattr(product, field, value)
    db.add(product)
    await db.commit()
    # Reload with relationships
    return await get_product(db, product_id)


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

        new_qty = product.available_quantity + payload.quantity
        if new_qty < 0:
            raise BadRequestError(
                f"Stock adjustment would result in negative quantity "
                f"({product.available_quantity} + {payload.quantity} = {new_qty})."
            )

        product.available_quantity = new_qty
        db.add(product)

        # Audit trail & Restock mapping
        if payload.quantity > 0:
            # Resolve effective supplier: payload override takes priority over product default
            effective_supplier_id = payload.supplier_id or product.supplier_id
            
            # If explicitly passed, optionally update the product's default supplier for the future
            if payload.supplier_id and payload.supplier_id != product.supplier_id:
                product.supplier_id = payload.supplier_id
                db.add(product)

            # Resolve effective unit price: payload override or current buy_price
            effective_unit_price = payload.unit_price if payload.unit_price is not None else product.buy_price

            from app.models.purchase import Purchase, PurchaseItem, PurchaseStatus

            purchase = Purchase(
                id=uuid.uuid4(),
                supplier_id=effective_supplier_id,
                total_amount=effective_unit_price * payload.quantity,
                status=PurchaseStatus.COMPLETED,
                notes=payload.reason
            )
            db.add(purchase)

            purchase_item = PurchaseItem(
                id=uuid.uuid4(),
                purchase_id=purchase.id,
                product_id=product.id,
                quantity=payload.quantity,
                unit_price=effective_unit_price
            )
            db.add(purchase_item)

            movement = StockMovement(
                id=uuid.uuid4(),
                product_id=product_id,
                supplier_id=effective_supplier_id,
                purchase_id=purchase.id,
                movement_type=MovementType.IN,
                quantity=payload.quantity,
                unit_price=effective_unit_price,
            )
            db.add(movement)
        else:
            movement = StockMovement(
                id=uuid.uuid4(),
                product_id=product_id,
                movement_type=MovementType.OUT,
                quantity=abs(payload.quantity),
                unit_price=product.buy_price,
            )
            db.add(movement)

        await db.commit()

    except Exception:
        await db.rollback()
        raise

    # Reload with relationships
    return await get_product(db, product_id)


async def delete_product(db: AsyncSession, product_id: uuid.UUID) -> None:
    product = await get_product(db, product_id)
    await db.delete(product)
    await db.commit()
