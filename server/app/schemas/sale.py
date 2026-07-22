"""
schemas/sale.py
Pydantic v2 schemas for Sale creation and responses.
The sale creation schema validates all items before the ACID transaction begins.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.sale import SaleStatus


class SaleItemRequest(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=Decimal("0"), decimal_places=4)


class SaleCreateRequest(BaseModel):
    client_id: uuid.UUID
    items: list[SaleItemRequest] = Field(..., min_length=1)
    notes: str | None = Field(None, max_length=500)

    @model_validator(mode="after")
    def no_duplicate_products(self) -> "SaleCreateRequest":
        product_ids = [item.product_id for item in self.items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError(
                "Duplicate product_id in sale items. Merge quantities instead."
            )
        return self


class SaleItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: Decimal
    subtotal: Decimal  # computed

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, item: object) -> "SaleItemResponse":
        from app.models.sale import SaleItem  # avoid circular at module level

        i: SaleItem = item  # type: ignore[assignment]
        return cls(
            id=i.id,
            product_id=i.product_id,
            quantity=i.quantity,
            unit_price=Decimal(str(i.unit_price)),
            subtotal=(Decimal(str(i.unit_price)) * i.quantity).quantize(Decimal("0.0001")),
        )


class SaleResponse(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    total_amount: Decimal
    status: SaleStatus
    notes: str | None
    sale_date: datetime
    items: list[SaleItemResponse] = []

    model_config = {"from_attributes": True}


class SaleListResponse(BaseModel):
    total: int
    items: list[SaleResponse]
