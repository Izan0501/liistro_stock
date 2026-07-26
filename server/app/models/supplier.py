"""
models/supplier.py
Supplier model — vendors who supply Rodrigo with products.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_person: Mapped[str | None] = mapped_column(String(200), nullable=True)
    contact_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    stock_movements: Mapped[list["StockMovement"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "StockMovement", back_populates="supplier", lazy="noload"
    )
    purchases: Mapped[list["Purchase"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Purchase", back_populates="supplier", lazy="noload"
    )
    products: Mapped[list["Product"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Product", back_populates="supplier", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Supplier id={self.id} name={self.name!r}>"
