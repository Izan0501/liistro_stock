"""
schemas/stock_movement.py
Pydantic v2 schemas for inventory ledger movements.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.stock_movement import MovementType


class StockMovementCreateRequest(BaseModel):
    """Used for manual restocks (IN movements) via the API."""

    product_id: uuid.UUID
    supplier_id: uuid.UUID | None = None
    movement_type: MovementType
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=Decimal("0"), decimal_places=4)


class StockMovementResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    supplier_id: uuid.UUID | None
    sale_id: uuid.UUID | None
    movement_type: MovementType
    quantity: int
    unit_price: Decimal
    movement_date: datetime

    model_config = {"from_attributes": True}


class StockMovementListResponse(BaseModel):
    total: int
    items: list[StockMovementResponse]
