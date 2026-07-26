"""
models/purchase.py
Purchase and PurchaseItem models.
Analogous to Sales, but for acquiring stock from Suppliers.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PurchaseStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Total monetary value of the purchase (sum of unit_price * quantity for all items)
    total_amount: Mapped[float] = mapped_column(
        Numeric(precision=12, scale=4), nullable=False, default=0
    )
    status: Mapped[PurchaseStatus] = mapped_column(
        SAEnum(PurchaseStatus, name="purchasestatus", create_type=True),
        nullable=False,
        default=PurchaseStatus.COMPLETED,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    purchase_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relationships
    supplier: Mapped["Supplier"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Supplier", back_populates="purchases", lazy="noload"
    )
    items: Mapped[list["PurchaseItem"]] = relationship(
        "PurchaseItem",
        back_populates="purchase",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<Purchase id={self.id} supplier={self.supplier_id} total={self.total_amount}>"


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    purchase_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(
        Numeric(precision=12, scale=4), nullable=False
    )

    # Relationships
    purchase: Mapped["Purchase"] = relationship("Purchase", back_populates="items", lazy="noload")
    product: Mapped["Product"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Product", back_populates="purchase_items", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<PurchaseItem purchase={self.purchase_id} product={self.product_id} qty={self.quantity}>"
