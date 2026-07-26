"""
models/stock_movement.py
Inventory Ledger — immutable audit trail for every stock IN/OUT event.
Every restock and every sale creates a row here. Rows MUST NOT be deleted.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MovementType(str, Enum):
    IN = "IN"    # Restock from supplier
    OUT = "OUT"  # Sale to client or manual adjustment


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Nullable — sales do not have a direct supplier link
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Nullable — links back to the sale that triggered this OUT movement
    sale_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Nullable — links back to the purchase that triggered this IN movement
    purchase_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    movement_type: Mapped[MovementType] = mapped_column(
        SAEnum(MovementType, name="movementtype", create_type=True),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(precision=12, scale=4), nullable=False)
    movement_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    # Relationships
    product: Mapped["Product"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Product", back_populates="stock_movements", lazy="noload"
    )
    supplier: Mapped["Supplier | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Supplier", back_populates="stock_movements", lazy="noload"
    )
    purchase: Mapped["Purchase | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Purchase", lazy="noload"
    )

    def __repr__(self) -> str:
        return (
            f"<StockMovement id={self.id} type={self.movement_type} "
            f"product={self.product_id} qty={self.quantity}>"
        )
