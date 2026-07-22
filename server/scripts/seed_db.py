"""
scripts/seed_db.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Liistro Stock ERP — Development Database Seeder
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Idempotent: Detects existing data and wipes tables in FK-safe order before
re-seeding, so the script can be executed repeatedly without errors.

Run from the server/ directory:
    python scripts/seed_db.py

Or inside Docker:
    docker compose exec api python scripts/seed_db.py
"""

# ── CRITICAL: path injection must be first ──────────────────────────────────
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
# ────────────────────────────────────────────────────────────────────────────

import asyncio
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from dotenv import load_dotenv

load_dotenv()  # load .env before importing app modules that read settings

from sqlalchemy import delete, select, text

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, engine
from app.models.client import Client
from app.models.financial_config import FinancialConfig
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.stock_movement import MovementType, StockMovement
from app.models.supplier import Supplier
from app.models.user import User

# ── ANSI colour helpers (no external deps required) ─────────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"
GREEN  = "\033[92m"
CYAN   = "\033[96m"
YELLOW = "\033[93m"
RED    = "\033[91m"
MAGENTA = "\033[95m"
DIM    = "\033[2m"

def _ok(msg: str)    -> None: print(f"  {GREEN}✔{RESET}  {msg}")
def _info(msg: str)  -> None: print(f"  {CYAN}→{RESET}  {msg}")
def _warn(msg: str)  -> None: print(f"  {YELLOW}⚠{RESET}  {msg}")
def _head(msg: str)  -> None: print(f"\n{BOLD}{MAGENTA}▶  {msg}{RESET}")
def _sep()           -> None: print(f"{DIM}{'─' * 62}{RESET}")


# ═══════════════════════════════════════════════════════════════════════════
# DATA DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

ADMIN_EMAIL    = "rodrigo@liistro.com"
ADMIN_PASSWORD = "admin123_dev_password"   # hashed with Argon2id before insert
INITIAL_CAPITAL = Decimal("5_000_000.0000")

# ── Suppliers ────────────────────────────────────────────────────────────────
SUPPLIERS_DATA: list[dict] = [
    {
        "name": "Coca-Cola Andina",
        "contact_info": "ventas@andina.com | +54 11 5555-0101",
    },
    {
        "name": "Molinos Río de la Plata",
        "contact_info": "distribuidores@molinos.com.ar | +54 11 5555-0202",
    },
    {
        "name": "Cervecería y Maltería Quilmes",
        "contact_info": "ventas@quilmes.com.ar | +54 11 5555-0303",
    },
    {
        "name": "Arcor Distribución Mayorista",
        "contact_info": "mayoristas@arcor.com.ar | +54 11 5555-0404",
    },
]

# ── Products ─────────────────────────────────────────────────────────────────
# supplier_index → 0-based index into the seeded suppliers list
# quantity       → initial stock units
# buy_price      → purchase price (BRL/ARS decimal)
# sell_price     → selling price  (wholesale margin ~25–40%)
PRODUCTS_DATA: list[dict] = [
    # Coca-Cola Andina (index 0)
    {
        "name": "Coca-Cola 2.25L",
        "supplier_index": 0,
        "quantity": 1200,
        "buy_price":  Decimal("680.0000"),
        "sell_price": Decimal("950.0000"),   # ~40% margin
    },
    {
        "name": "Coca-Cola 1.5L Pack x6",
        "supplier_index": 0,
        "quantity": 800,
        "buy_price":  Decimal("1950.0000"),
        "sell_price": Decimal("2700.0000"),  # ~38% margin
    },
    {
        "name": "Sprite 2L",
        "supplier_index": 0,
        "quantity": 650,
        "buy_price":  Decimal("620.0000"),
        "sell_price": Decimal("850.0000"),   # ~37% margin
    },
    {
        "name": "Fanta Naranja 2L",
        "supplier_index": 0,
        "quantity": 500,
        "buy_price":  Decimal("620.0000"),
        "sell_price": Decimal("840.0000"),   # ~35% margin
    },
    # Molinos Río de la Plata (index 1)
    {
        "name": "Fideos Matarazzo Spaghetti 500g",
        "supplier_index": 1,
        "quantity": 1500,
        "buy_price":  Decimal("290.0000"),
        "sell_price": Decimal("399.0000"),   # ~37% margin
    },
    {
        "name": "Arroz Gallo Largo Fino 1kg",
        "supplier_index": 1,
        "quantity": 1300,
        "buy_price":  Decimal("450.0000"),
        "sell_price": Decimal("620.0000"),   # ~38% margin
    },
    {
        "name": "Harina Blancaflor 1kg",
        "supplier_index": 1,
        "quantity": 900,
        "buy_price":  Decimal("370.0000"),
        "sell_price": Decimal("510.0000"),   # ~38% margin
    },
    # Cervecería y Maltería Quilmes (index 2)
    {
        "name": "Cerveza Quilmes 1L Retornable",
        "supplier_index": 2,
        "quantity": 750,
        "buy_price":  Decimal("480.0000"),
        "sell_price": Decimal("680.0000"),   # ~42% margin
    },
    {
        "name": "Cerveza Quilmes Lata 473ml x24",
        "supplier_index": 2,
        "quantity": 600,
        "buy_price":  Decimal("4800.0000"),
        "sell_price": Decimal("6500.0000"),  # ~35% margin
    },
    {
        "name": "Stella Artois Lata 473ml x24",
        "supplier_index": 2,
        "quantity": 520,
        "buy_price":  Decimal("5500.0000"),
        "sell_price": Decimal("7400.0000"),  # ~34% margin
    },
    # Arcor Distribución Mayorista (index 3)
    {
        "name": "Yerba Taragüí 1kg",
        "supplier_index": 3,
        "quantity": 1100,
        "buy_price":  Decimal("890.0000"),
        "sell_price": Decimal("1250.0000"),  # ~40% margin
    },
    {
        "name": "Galletitas Oreo Pack x6",
        "supplier_index": 3,
        "quantity": 850,
        "buy_price":  Decimal("1200.0000"),
        "sell_price": Decimal("1650.0000"),  # ~37% margin
    },
    {
        "name": "Aceite Natura Girasol 1.5L",
        "supplier_index": 3,
        "quantity": 700,
        "buy_price":  Decimal("1100.0000"),
        "sell_price": Decimal("1520.0000"),  # ~38% margin
    },
    {
        "name": "Azúcar Ledesma 1kg",
        "supplier_index": 3,
        "quantity": 1400,
        "buy_price":  Decimal("340.0000"),
        "sell_price": Decimal("480.0000"),   # ~41% margin
    },
    {
        "name": "Sal Celusal 1kg",
        "supplier_index": 3,
        "quantity": 600,
        "buy_price":  Decimal("210.0000"),
        "sell_price": Decimal("290.0000"),   # ~38% margin
    },
]

# ── Clients ──────────────────────────────────────────────────────────────────
CLIENTS_DATA: list[dict] = [
    {
        "name": "Almacén Don Pepe",
        "phone": "+54 11 4523-7890",
        "address": "Av. San Martín 1245, Morón, Buenos Aires",
    },
    {
        "name": "Kiosco El Pelado",
        "phone": "+54 11 4681-2345",
        "address": "Lavalle 876, Haedo, Buenos Aires",
    },
    {
        "name": "Supermercado Sol",
        "phone": "+54 11 4455-9876",
        "address": "Rivadavia 3210, Palermo, CABA",
    },
    {
        "name": "Despensa Las 24hs",
        "phone": "+54 11 4789-0123",
        "address": "Corrientes 5678, Almagro, CABA",
    },
    {
        "name": "Minimercado El Trébol",
        "phone": "+54 11 4231-5678",
        "address": "Juncal 890, Ramos Mejía, Buenos Aires",
    },
    {
        "name": "Almacén La Esquina",
        "phone": "+54 11 4567-3456",
        "address": "Belgrano 432, Ituzaingó, Buenos Aires",
    },
    {
        "name": "Supermercado Los Andes",
        "phone": "+54 11 4901-2345",
        "address": "Mitre 1560, Lomas de Zamora, Buenos Aires",
    },
    {
        "name": "Kiosco y Rotisería La Familia",
        "phone": "+54 11 4334-8901",
        "address": "Sarmiento 2234, Flores, CABA",
    },
    {
        "name": "Despensa Santa Lucía",
        "phone": "+54 11 4678-0012",
        "address": "Perón 789, Castelar, Buenos Aires",
    },
    {
        "name": "Bufet El Central",
        "phone": "+54 11 4123-6789",
        "address": "Independencia 3456, San Justo, Buenos Aires",
    },
]


# ═══════════════════════════════════════════════════════════════════════════
# WIPE — FK-safe deletion order
# ═══════════════════════════════════════════════════════════════════════════

async def wipe_tables(session) -> None:
    """Delete all data in reverse-FK order so constraints are never violated."""
    _info("Wiping existing data in FK-safe order…")

    # Children first
    await session.execute(delete(StockMovement))
    await session.execute(delete(SaleItem))
    await session.execute(delete(Sale))
    await session.execute(delete(Product))
    await session.execute(delete(Client))
    await session.execute(delete(Supplier))
    await session.execute(delete(User))
    await session.execute(delete(FinancialConfig))

    await session.commit()
    _ok("All tables cleared.")


# ═══════════════════════════════════════════════════════════════════════════
# SEED FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

async def seed_admin(session) -> User:
    _head("Admin User")
    user = User(
        id=uuid.uuid4(),
        name="Rodrigo Liistro",
        email=ADMIN_EMAIL,
        hashed_password=hash_password(ADMIN_PASSWORD),
        role="admin",
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    _ok(f"Created admin: {BOLD}{user.email}{RESET}")
    return user


async def seed_suppliers(session) -> list[Supplier]:
    _head("Suppliers")
    suppliers: list[Supplier] = []
    for data in SUPPLIERS_DATA:
        supplier = Supplier(
            id=uuid.uuid4(),
            name=data["name"],
            contact_info=data["contact_info"],
        )
        session.add(supplier)
        suppliers.append(supplier)
    await session.commit()
    for s in suppliers:
        await session.refresh(s)
        _ok(f"Supplier: {s.name}")
    return suppliers


async def seed_products_and_ledger(
    session,
    suppliers: list[Supplier],
) -> list[Product]:
    _head("Products + Initial Stock Movements (IN)")

    products: list[Product] = []
    movements: list[StockMovement] = []

    for data in PRODUCTS_DATA:
        supplier = suppliers[data["supplier_index"]]
        product = Product(
            id=uuid.uuid4(),
            name=data["name"],
            available_quantity=data["quantity"],
            buy_price=data["buy_price"],
            sell_price=data["sell_price"],
        )
        session.add(product)
        products.append(product)

        # Flush to get the product.id for FK reference in StockMovement
        await session.flush()

        # Mandatory ledger entry: initial IN movement
        movement = StockMovement(
            id=uuid.uuid4(),
            product_id=product.id,
            supplier_id=supplier.id,
            sale_id=None,
            movement_type=MovementType.IN,
            quantity=data["quantity"],
            unit_price=data["buy_price"],
        )
        session.add(movement)
        movements.append(movement)

        margin_pct = (
            (data["sell_price"] - data["buy_price"]) / data["sell_price"] * 100
        ).quantize(Decimal("0.1"))
        _ok(
            f"{data['name']:<40} "
            f"{GREEN}qty={data['quantity']:>5}{RESET}  "
            f"margin={CYAN}{margin_pct}%{RESET}  "
            f"supplier={DIM}{supplier.name}{RESET}"
        )

    await session.commit()
    return products


async def seed_clients(session) -> list[Client]:
    _head("Clients")
    clients: list[Client] = []
    for data in CLIENTS_DATA:
        client = Client(
            id=uuid.uuid4(),
            name=data["name"],
            phone=data["phone"],
            address=data["address"],
        )
        session.add(client)
        clients.append(client)
    await session.commit()
    for c in clients:
        await session.refresh(c)
        _ok(f"{c.name:<40} {DIM}{c.phone}{RESET}")
    return clients


async def seed_financial_config(session) -> FinancialConfig:
    _head("Financial Configuration")
    config = FinancialConfig(
        id=uuid.uuid4(),
        initial_capital=INITIAL_CAPITAL,
    )
    session.add(config)
    await session.commit()
    await session.refresh(config)
    _ok(
        f"Initial capital set to: "
        f"{BOLD}{GREEN}$ {INITIAL_CAPITAL:,.2f}{RESET}"
    )
    return config


# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY BOX
# ═══════════════════════════════════════════════════════════════════════════

def _print_summary(
    user: User,
    suppliers: list[Supplier],
    products: list[Product],
    clients: list[Client],
    capital: Decimal,
) -> None:
    W = 62
    box_top    = f"╔{'═' * W}╗"
    box_bottom = f"╚{'═' * W}╝"
    sep_line   = f"╠{'═' * W}╣"

    def row(label: str, value: str, colour: str = RESET) -> str:
        content = f"  {BOLD}{label:<22}{RESET}{colour}{value}{RESET}"
        # strip ANSI for length calculation
        import re
        raw_len = len(re.sub(r"\033\[[0-9;]*m", "", content))
        padding = W - raw_len
        return f"║{content}{' ' * max(padding, 0)}║"

    def title(text: str) -> str:
        centred = text.center(W)
        return f"║{BOLD}{CYAN}{centred}{RESET}║"

    print(f"\n{GREEN}{box_top}{RESET}")
    print(title("  🌿  SEED COMPLETE — Liistro Stock ERP  🌿  "))
    print(f"{GREEN}{sep_line}{RESET}")
    print(row("Admin Email:",    user.email,                   CYAN))
    print(row("Admin Password:", ADMIN_PASSWORD,               YELLOW))
    print(row("Admin Role:",     user.role.upper(),            GREEN))
    print(f"{GREEN}{sep_line}{RESET}")
    print(row("Suppliers:",      str(len(suppliers)),          CYAN))
    print(row("Products:",       str(len(products)),           CYAN))
    print(row("Stock Movements:", str(len(products)) + "  (1× IN per product)", CYAN))
    print(row("Clients:",        str(len(clients)),            CYAN))
    print(row("Initial Capital:", f"$ {capital:,.2f}",         GREEN))
    print(f"{GREEN}{sep_line}{RESET}")
    print(row("API Docs:",       "http://localhost:8000/api/v1/docs", DIM))
    print(f"{GREEN}{box_bottom}{RESET}\n")


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

async def main() -> None:
    print(f"\n{BOLD}{CYAN}{'═' * 62}")
    print("  Liistro Stock ERP — Database Seeder".center(62))
    print(f"{'═' * 62}{RESET}")

    async with AsyncSessionLocal() as session:

        # ── Idempotency check ───────────────────────────────────────────
        _head("Idempotency Check")
        existing_user = await session.scalar(
            select(User).where(User.email == ADMIN_EMAIL)
        )
        if existing_user:
            _warn(
                f"Admin user '{ADMIN_EMAIL}' already exists. "
                "Wiping all tables for a clean reseed…"
            )
            await wipe_tables(session)
        else:
            _ok("No existing seed data detected. Starting fresh insert.")

        # ── Seed in dependency order ────────────────────────────────────
        user      = await seed_admin(session)
        suppliers = await seed_suppliers(session)
        products  = await seed_products_and_ledger(session, suppliers)
        clients   = await seed_clients(session)
        config    = await seed_financial_config(session)

    # ── Dispose the engine connection pool ──────────────────────────────
    await engine.dispose()

    _print_summary(user, suppliers, products, clients, INITIAL_CAPITAL)


if __name__ == "__main__":
    asyncio.run(main())
