"""
db/base.py
Declarative base shared by all ORM models.

IMPORTANT — keep this file pure and import-free.
Do NOT import any app.models here: that creates a circular dependency
(models import Base from this file; if this file imports models → cycle).

Alembic model registration lives in alembic/env.py, which sits outside
the app package and can safely import both Base and every model.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """All SQLAlchemy models inherit from this base."""

    pass
