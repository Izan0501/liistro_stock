"""
schemas/purchase.py
Pydantic v2 schemas for Purchase creation and responses.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.purchase import PurchaseStatus


class PurchaseItemRequest(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., gt=Decimal("0"), decimal_places=4)


class PurchaseCreateRequest(BaseModel):
    supplier_id: uuid.UUID
    items: list[PurchaseItemRequest] = Field(..., min_length=1)
    notes: str | None = Field(None, max_length=500)

    @model_validator(mode="after")
    def no_duplicate_products(self) -> "PurchaseCreateRequest":
        product_ids = [item.product_id for item in self.items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError(
                "Duplicate product_id in purchase items. Merge quantities instead."
            )
        return self


class PurchaseItemResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID | None = None
    product_name: str | None = None
    quantity: int
    unit_price: Decimal
    subtotal: Decimal  # computed

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, item: object) -> "PurchaseItemResponse":
        from app.models.purchase import PurchaseItem  # avoid circular

        i: PurchaseItem = item  # type: ignore[assignment]
        
        product_name = i.product.name if getattr(i, "product", None) else None
        
        return cls(
            id=i.id,
            product_id=i.product_id,
            product_name=product_name,
            quantity=i.quantity,
            unit_price=Decimal(str(i.unit_price)),
            subtotal=(Decimal(str(i.unit_price)) * i.quantity).quantize(Decimal("0.0001")),
        )


class PurchaseResponse(BaseModel):
    id: uuid.UUID
    supplier_id: uuid.UUID | None = None
    supplier_name: str | None = None
    total_amount: Decimal
    total_items: int = 0
    status: PurchaseStatus
    notes: str | None
    purchase_date: datetime
    items: list[PurchaseItemResponse] = []

    model_config = {"from_attributes": True}


class PurchaseListResponse(BaseModel):
    total: int
    items: list[PurchaseResponse]
