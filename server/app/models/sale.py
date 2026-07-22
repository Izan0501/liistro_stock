"""
models/sale.py
Sale and SaleItem models.
A Sale is always created inside a serialisable ACID transaction that
simultaneously deducts stock and records revenue.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SaleStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Total monetary value of the sale (sum of unit_price * quantity for all items)
    total_amount: Mapped[float] = mapped_column(
        Numeric(precision=12, scale=4), nullable=False, default=0
    )
    status: Mapped[SaleStatus] = mapped_column(
        SAEnum(SaleStatus, name="salestatus", create_type=True),
        nullable=False,
        default=SaleStatus.COMPLETED,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    sale_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relationships
    client: Mapped["Client"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Client", back_populates="sales", lazy="noload"
    )
    items: Mapped[list["SaleItem"]] = relationship(
        "SaleItem",
        back_populates="sale",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<Sale id={self.id} client={self.client_id} total={self.total_amount}>"


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sale_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(
        Numeric(precision=12, scale=4), nullable=False
    )

    # Relationships
    sale: Mapped["Sale"] = relationship("Sale", back_populates="items", lazy="noload")
    product: Mapped["Product"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Product", back_populates="sale_items", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<SaleItem sale={self.sale_id} product={self.product_id} qty={self.quantity}>"
