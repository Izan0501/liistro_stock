"""
services/supplier_service.py
Supplier CRUD business logic.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreateRequest, SupplierUpdateRequest


async def create_supplier(
    db: AsyncSession, payload: SupplierCreateRequest
) -> Supplier:
    supplier = Supplier(
        id=uuid.uuid4(),
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        contact_person=payload.contact_person,
        contact_info=payload.contact_info,
    )
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier


async def get_supplier(db: AsyncSession, supplier_id: uuid.UUID) -> Supplier:
    supplier = await db.get(Supplier, supplier_id)
    if not supplier:
        raise NotFoundError(f"Supplier {supplier_id} not found.")
    return supplier


async def list_suppliers(
    db: AsyncSession,
    search: str | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[int, list[Supplier]]:
    base_q = select(Supplier)
    if search:
        pattern = f"%{search.lower()}%"
        base_q = base_q.where(func.lower(Supplier.name).like(pattern))

    total: int = await db.scalar(
        select(func.count()).select_from(base_q.subquery())
    ) or 0

    result = await db.execute(
        base_q.order_by(Supplier.name).offset(offset).limit(limit)
    )
    items = list(result.scalars().all())
    return total, items


async def update_supplier(
    db: AsyncSession, supplier_id: uuid.UUID, payload: SupplierUpdateRequest
) -> Supplier:
    supplier = await get_supplier(db, supplier_id)
    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier


async def delete_supplier(db: AsyncSession, supplier_id: uuid.UUID) -> None:
    supplier = await get_supplier(db, supplier_id)
    await db.delete(supplier)
    await db.commit()
