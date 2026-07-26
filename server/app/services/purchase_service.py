"""
services/purchase_service.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACID Purchase Transaction — acquiring stock from suppliers.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.exceptions import NotFoundError, BadRequestError
from app.models.supplier import Supplier
from app.models.financial_config import FinancialConfig
from app.models.product import Product
from app.models.purchase import Purchase, PurchaseItem, PurchaseStatus
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.purchase import PurchaseCreateRequest, PurchaseItemResponse, PurchaseResponse


async def create_purchase(
    db: AsyncSession, payload: PurchaseCreateRequest
) -> Purchase:
    """
    Execute the full ACID purchase transaction.
    """
    try:
        # ── Step 1: Validate supplier exists ─────────────────────────────────
        supplier = await db.get(Supplier, payload.supplier_id)
        if not supplier:
            raise NotFoundError(f"Supplier {payload.supplier_id} not found.")

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

        # ── Step 3: Compute total amount ─────────────────────────────────────
        total_amount = sum(
            item.unit_price * item.quantity
            for item in payload.items
        )

        # ── Step 4: Insert Purchase record ───────────────────────────────────
        purchase = Purchase(
            id=uuid.uuid4(),
            supplier_id=payload.supplier_id,
            total_amount=total_amount,
            status=PurchaseStatus.COMPLETED,
            notes=payload.notes,
        )
        db.add(purchase)
        await db.flush()

        # ── Step 5: Process each line item ───────────────────────────────────
        for item in payload.items:
            product = locked_products[item.product_id]

            purchase_item = PurchaseItem(
                id=uuid.uuid4(),
                purchase_id=purchase.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            db.add(purchase_item)

            product.available_quantity += item.quantity
            # Update buy_price as it's the latest acquisition cost
            product.buy_price = item.unit_price
            db.add(product)

            movement = StockMovement(
                id=uuid.uuid4(),
                product_id=item.product_id,
                supplier_id=supplier.id,
                purchase_id=purchase.id,
                movement_type=MovementType.IN,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            db.add(movement)

        # ── Step 7: COMMIT ───────────────────────────────────────────────────
        await db.commit()

    except Exception:
        await db.rollback()
        raise

    # ── Reload with eager-loaded items for the HTTP response ─────────────────
    result = await db.execute(
        select(Purchase)
        .options(
            joinedload(Purchase.supplier),
            selectinload(Purchase.items).joinedload(PurchaseItem.product)
        )
        .where(Purchase.id == purchase.id)
    )
    return result.scalar_one()


async def get_purchase(db: AsyncSession, purchase_id: uuid.UUID) -> Purchase:
    result = await db.execute(
        select(Purchase)
        .options(
            joinedload(Purchase.supplier),
            selectinload(Purchase.items).joinedload(PurchaseItem.product)
        )
        .where(Purchase.id == purchase_id)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise NotFoundError(f"Purchase {purchase_id} not found.")
    return purchase


async def list_purchases(
    db: AsyncSession,
    supplier_id: uuid.UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[int, list[PurchaseResponse]]:
    """
    Return paginated purchases with supplier_name and total_items pre-computed.
    Eagerly loads supplier and items (along with product) to prevent N+1 queries.
    """
    base_q = (
        select(Purchase)
        .options(
            joinedload(Purchase.supplier),
            selectinload(Purchase.items).joinedload(PurchaseItem.product)
        )
    )

    if supplier_id:
        base_q = base_q.where(Purchase.supplier_id == supplier_id)
    if start_date:
        start_dt = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=timezone.utc)
        base_q = base_q.where(Purchase.purchase_date >= start_dt)
    if end_date:
        end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc)
        base_q = base_q.where(Purchase.purchase_date <= end_dt)

    count_base = select(Purchase)
    if supplier_id:
        count_base = count_base.where(Purchase.supplier_id == supplier_id)
    if start_date:
        start_dt = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=timezone.utc)
        count_base = count_base.where(Purchase.purchase_date >= start_dt)
    if end_date:
        end_dt = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc)
        count_base = count_base.where(Purchase.purchase_date <= end_dt)
    
    total: int = await db.scalar(
        select(func.count()).select_from(count_base.subquery())
    ) or 0

    rows = await db.execute(
        base_q.order_by(Purchase.purchase_date.desc()).offset(offset).limit(limit)
    )

    purchases = list(rows.scalars().all())
    responses: list[PurchaseResponse] = []
    
    for purchase_obj in purchases:
        s_name = purchase_obj.supplier.name if getattr(purchase_obj, "supplier", None) else None
        t_items = sum(i.quantity for i in purchase_obj.items) if getattr(purchase_obj, "items", None) else 0

        responses.append(
            PurchaseResponse(
                id=purchase_obj.id,
                supplier_id=purchase_obj.supplier_id,
                supplier_name=s_name,
                total_amount=Decimal(str(purchase_obj.total_amount)),
                total_items=t_items,
                status=purchase_obj.status,
                notes=purchase_obj.notes,
                purchase_date=purchase_obj.purchase_date,
                items=[PurchaseItemResponse.from_orm(i) for i in purchase_obj.items],
            )
        )

    return total, responses
