"""
services/client_service.py
Client CRUD and search business logic.
Optimised for rapid on-the-fly lookup during active sale workflows.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.client import Client
from app.schemas.client import ClientCreateRequest, ClientUpdateRequest


async def create_client(
    db: AsyncSession, payload: ClientCreateRequest
) -> Client:
    client = Client(
        id=uuid.uuid4(),
        name=payload.name,
        phone=payload.phone,
        address=payload.address,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


async def get_client(db: AsyncSession, client_id: uuid.UUID) -> Client:
    client = await db.get(Client, client_id)
    if not client:
        raise NotFoundError(f"Client {client_id} not found.")
    return client


async def list_clients(
    db: AsyncSession,
    search: str | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[int, list[Client]]:
    """
    Return (total_count, page_items).
    Supports case-insensitive name/phone search.
    """
    base_q = select(Client)
    if search:
        pattern = f"%{search.lower()}%"
        base_q = base_q.where(
            or_(
                func.lower(Client.name).like(pattern),
                func.lower(Client.phone).like(pattern),
            )
        )

    total: int = await db.scalar(
        select(func.count()).select_from(base_q.subquery())
    ) or 0

    result = await db.execute(
        base_q.order_by(Client.name).offset(offset).limit(limit)
    )
    items = list(result.scalars().all())
    return total, items


async def update_client(
    db: AsyncSession, client_id: uuid.UUID, payload: ClientUpdateRequest
) -> Client:
    client = await get_client(db, client_id)
    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


async def delete_client(db: AsyncSession, client_id: uuid.UUID) -> None:
    client = await get_client(db, client_id)
    await db.delete(client)
    await db.commit()
