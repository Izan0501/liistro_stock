"""
schemas/product.py
Pydantic v2 schemas for Product CRUD with Decimal-safe price fields.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class SupplierMinimalResponse(BaseModel):
    id: uuid.UUID
    name: str


class ProductCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str | None = Field(None, max_length=100)
    supplier_id: uuid.UUID | None = None
    available_quantity: int = Field(0, ge=0)
    sell_price: Decimal = Field(..., gt=Decimal("0"), decimal_places=4)
    buy_price: Decimal = Field(..., gt=Decimal("0"), decimal_places=4)


class ProductUpdateRequest(BaseModel):
    """Only these fields may be updated via PATCH. Stock MUST use /adjust-stock."""
    name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = Field(None, max_length=100)
    supplier_id: uuid.UUID | None = None
    sell_price: Decimal | None = Field(None, gt=Decimal("0"), decimal_places=4)
    buy_price: Decimal | None = Field(None, gt=Decimal("0"), decimal_places=4)


class ProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    category: str | None = None
    supplier: SupplierMinimalResponse | None = None
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
        
        supplier_obj = None
        if getattr(p, "supplier", None):
            supplier_obj = SupplierMinimalResponse(id=p.supplier.id, name=p.supplier.name)
        
        return cls(
            id=p.id,
            name=p.name,
            category=p.category,
            supplier=supplier_obj,
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
    """Adjust available_quantity. Positive delta = restock (creates Purchase). Negative = write-off."""

    quantity: int = Field(..., description="Positive to add stock, negative to subtract")
    reason: str = Field("Restock manual", max_length=500, description="Optional reason or notes for this adjustment")
    # For restocks: optionally override which supplier and unit_price to record
    supplier_id: uuid.UUID | None = Field(None, description="Override product's default supplier for this restock")
    unit_price: Decimal | None = Field(None, gt=Decimal("0"), description="Override unit cost recorded for this restock")

    @field_validator("reason", mode="before")
    @classmethod
    def set_default_reason(cls, v: str | None) -> str:
        if not v or not str(v).strip():
            return "Restock manual"
        return str(v)
