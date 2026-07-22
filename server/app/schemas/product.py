"""
schemas/product.py
Pydantic v2 schemas for Product CRUD with Decimal-safe price fields.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ProductCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    available_quantity: int = Field(0, ge=0)
    sell_price: Decimal = Field(..., gt=Decimal("0"), decimal_places=4)
    buy_price: Decimal = Field(..., gt=Decimal("0"), decimal_places=4)


class ProductUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    sell_price: Decimal | None = Field(None, gt=Decimal("0"), decimal_places=4)
    buy_price: Decimal | None = Field(None, gt=Decimal("0"), decimal_places=4)


class ProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    available_quantity: int
    sell_price: Decimal
    buy_price: Decimal
    profit_margin: Decimal  # computed field
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_margin(cls, product: object) -> "ProductResponse":
        """Create response and compute profit margin inline."""
        from app.models.product import Product  # avoid circular at module level

        p: Product = product  # type: ignore[assignment]
        sell = Decimal(str(p.sell_price))
        buy = Decimal(str(p.buy_price))
        margin = ((sell - buy) / sell * 100).quantize(Decimal("0.01")) if sell else Decimal("0")
        return cls(
            id=p.id,
            name=p.name,
            available_quantity=p.available_quantity,
            sell_price=sell,
            buy_price=buy,
            profit_margin=margin,
            created_at=p.created_at,
        )


class ProductListResponse(BaseModel):
    total: int
    items: list[ProductResponse]


class StockAdjustRequest(BaseModel):
    """Manually adjust available_quantity (e.g. loss/damage write-off)."""

    quantity_delta: int = Field(..., description="Positive to add, negative to subtract")
    reason: str = Field(..., min_length=3, max_length=255)
