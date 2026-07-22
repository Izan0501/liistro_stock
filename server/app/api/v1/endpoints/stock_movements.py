"""
api/v1/endpoints/stock_movements.py
Stock movement (inventory ledger) endpoints.
Only IN (restock) movements are created here.
OUT movements are automatically created by the sale service.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.db.session import get_db
from app.models.stock_movement import MovementType
from app.models.user import User
from app.schemas.stock_movement import (
    StockMovementCreateRequest,
    StockMovementListResponse,
    StockMovementResponse,
)
from app.services import stock_service

router = APIRouter(prefix="/stock-movements", tags=["Stock Movements"])


@router.post(
    "",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a restock (IN) movement",
)
async def create_restock(
    payload: StockMovementCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StockMovementResponse:
    movement = await stock_service.create_restock(db, payload)
    return StockMovementResponse.model_validate(movement)


@router.get(
    "",
    response_model=StockMovementListResponse,
    status_code=status.HTTP_200_OK,
    summary="List inventory movements with optional filters",
)
async def list_movements(
    product_id: uuid.UUID | None = Query(None),
    movement_type: MovementType | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> StockMovementListResponse:
    total, items = await stock_service.list_movements(
        db, product_id, movement_type, offset, limit
    )
    return StockMovementListResponse(
        total=total,
        items=[StockMovementResponse.model_validate(m) for m in items],
    )
