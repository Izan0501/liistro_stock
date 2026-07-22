"""
models/product.py
Product model — inventory items with real-time quantity tracking.
NUMERIC precision (12, 4) chosen to handle BRL currency without float drift.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Quantity stored as Integer; fractions not needed for Rodrigo's distribution
    available_quantity: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )

    # NUMERIC(12, 4) avoids IEEE-754 floating-point rounding errors in financial math
    sell_price: Mapped[float] = mapped_column(
        Numeric(precision=12, scale=4), nullable=False
    )
    buy_price: Mapped[float] = mapped_column(
        Numeric(precision=12, scale=4), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    stock_movements: Mapped[list["StockMovement"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "StockMovement", back_populates="product", lazy="noload"
    )
    sale_items: Mapped[list["SaleItem"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "SaleItem", back_populates="product", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name!r} qty={self.available_quantity}>"
