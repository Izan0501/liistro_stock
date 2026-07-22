"""
models/financial_config.py
Singleton table (max 1 row) storing Rodrigo's initial business capital.
This value is used by the dashboard to calculate total net worth:
  Total Capital = initial_capital + SUM(sales revenue) - SUM(restock expenses)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FinancialConfig(Base):
    __tablename__ = "financial_config"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    initial_capital: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=4), nullable=False, default=Decimal("0.0000")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<FinancialConfig initial_capital={self.initial_capital}>"
