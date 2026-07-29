import uuid
from decimal import Decimal
from datetime import datetime
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
    product_id: uuid.UUID | None = None
    product_name: str | None = None
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, item: object) -> "SaleItemResponse":
        from app.models.sale import SaleItem
        i: SaleItem = item  # type: ignore[assignment]
        product_name = i.product.name if getattr(i, "product", None) else None
        return cls(
            id=i.id,
            product_id=i.product_id,
            product_name=product_name,
            quantity=i.quantity,
            unit_price=Decimal(str(i.unit_price)),
            subtotal=(Decimal(str(i.unit_price)) * i.quantity).quantize(Decimal("0.0001")),
        )

class SaleResponse(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    client_name: str | None = None
    total_amount: Decimal
    total_items: int = 0
    status: SaleStatus
    notes: str | None
    sale_date: datetime
    items: list[SaleItemResponse] = []

    model_config = {"from_attributes": True}

class SaleListResponse(BaseModel):
    total: int
    items: list[SaleResponse]

class LowStockAlert(BaseModel):
    product_id: uuid.UUID
    product_name: str
    remaining_stock: int

class SaleCreateResponseWrapper(BaseModel):
    status: str
    data: SaleResponse
    low_stock_alerts: list[LowStockAlert] = []
