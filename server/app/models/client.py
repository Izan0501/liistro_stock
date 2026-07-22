"""
models/client.py
Client model — Rodrigo's ~250 distribution customers.
Optimised for rapid name/phone searching.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    sales: Mapped[list["Sale"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Sale", back_populates="client", lazy="noload"
    )

    # Composite index for name search (case-insensitive via pg_trgm ideally)
    __table_args__ = (
        Index("ix_clients_name_trgm", "name"),
    )

    def __repr__(self) -> str:
        return f"<Client id={self.id} name={self.name!r}>"
