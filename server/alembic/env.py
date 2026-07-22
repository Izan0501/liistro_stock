"""
alembic/env.py
Alembic async migration environment.
Reads DATABASE_URL from .env so credentials are never hardcoded.
Supports both online (live DB) and offline (SQL script) modes.
"""

from __future__ import annotations

# ── Path injection so `app.*` is importable when Alembic runs from any CWD ──
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# ── Stdlib ───────────────────────────────────────────────────────────────────
import asyncio
import os
from logging.config import fileConfig

# ── Third-party ──────────────────────────────────────────────────────────────
from alembic import context
from dotenv import load_dotenv
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# ── Load .env before any app imports that read settings ──────────────────────
load_dotenv()

# ── App: declarative base (must be imported first, before models) ─────────────
from app.db.base import Base  # noqa: E402

# ── App: all ORM models — imported here (and ONLY here) so that
#    Base.metadata is fully populated for Alembic autogenerate.
#    These imports are intentionally side-effect-only (F401 suppressed).
#    Import order follows FK dependency: no model references one below it.
from app.models.user import User  # noqa: E402, F401
from app.models.client import Client  # noqa: E402, F401
from app.models.supplier import Supplier  # noqa: E402, F401
from app.models.product import Product  # noqa: E402, F401
from app.models.stock_movement import StockMovement  # noqa: E402, F401
from app.models.sale import Sale, SaleItem  # noqa: E402, F401
from app.models.financial_config import FinancialConfig  # noqa: E402, F401

# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config

# Override the sqlalchemy URL from .env — credentials never live in alembic.ini
config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

# Wire up Python logging defined in alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for schema diffing / autogenerate
target_metadata = Base.metadata


# ── Offline mode — emit SQL script without a live DB connection ───────────────
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,            # detect column type changes
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode — connect to the live database asynchronously ─────────────────
def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
