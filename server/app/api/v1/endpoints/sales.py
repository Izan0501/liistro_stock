"""
api/v1/endpoints/sales.py
Sale endpoints — creation triggers the full ACID transaction.
"""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.sale import (
    SaleCreateRequest,
    SaleCreateResponseWrapper,
    SaleItemResponse,
    SaleListResponse,
    LowStockAlert,
    SaleResponse,
)
from app.services import sale_service

router = APIRouter(prefix="/sales", tags=["Sales"])

LOW_STOCK_THRESHOLD = 10


def _sale_to_response(sale: object) -> SaleResponse:
    """Map ORM Sale → SaleResponse, computing item subtotals."""
    from app.models.sale import Sale  # local import to avoid circular

    s: Sale = sale  # type: ignore[assignment]
    c_name = s.client.name if getattr(s, "client", None) else None
    
    return SaleResponse(
        id=s.id,
        client_id=s.client_id,
        client_name=c_name,
        total_amount=s.total_amount,  # type: ignore[arg-type]
        total_items=sum(i.quantity for i in s.items) if getattr(s, "items", None) else 0,
        status=s.status,
        notes=s.notes,
        sale_date=s.sale_date,
        items=[SaleItemResponse.from_orm(item) for item in s.items] if getattr(s, "items", None) else [],
    )


@router.post(
    "",
    response_model=SaleCreateResponseWrapper,
    status_code=status.HTTP_201_CREATED,
    summary="Create a sale, deduct stock, and return low-stock alerts",
)
async def create_sale(
    payload: SaleCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleCreateResponseWrapper:
    """
    Triggers the ACID transaction:
    - Validates stock for all items
    - Creates Sale + SaleItems
    - Deducts product quantities
    - Writes StockMovement (OUT) audit entries
    - Updates FinancialConfig capital
    All-or-nothing: any failure rolls back the entire transaction.

    After commit, evaluates remaining stock for each affected product.
    Any product at or below LOW_STOCK_THRESHOLD (10) is appended to
    low_stock_alerts so the frontend can surface a warning to the user.
    """
    sale = await sale_service.create_sale(db, payload)
    sale_response = _sale_to_response(sale)

    # ── Build low-stock alert list from eagerly-loaded items ──────────────────
    low_stock_alerts: list[LowStockAlert] = []
    if getattr(sale, "items", None):
        from app.models.sale import SaleItem  # local import to avoid circular
        seen: set[uuid.UUID] = set()
        for item in sale.items:  # type: ignore[union-attr]
            si: SaleItem = item  # type: ignore[assignment]
            product = getattr(si, "product", None)
            if product is None or si.product_id in seen:
                continue
            seen.add(si.product_id)
            if product.available_quantity <= LOW_STOCK_THRESHOLD:
                low_stock_alerts.append(
                    LowStockAlert(
                        product_id=product.id,
                        product_name=product.name,
                        remaining_stock=product.available_quantity,
                    )
                )

    return SaleCreateResponseWrapper(
        status="success",
        data=sale_response,
        low_stock_alerts=low_stock_alerts,
    )


@router.get(
    "",
    response_model=SaleListResponse,
    status_code=status.HTTP_200_OK,
    summary="Delivery history — list sales with optional date and client filters",
)
async def list_sales(
    client_id: uuid.UUID | None = Query(None, description="Filter by client UUID"),
    start_date: date | None = Query(None, description="ISO 8601 start date (inclusive), e.g. 2025-07-01"),
    end_date: date | None = Query(None, description="ISO 8601 end date (inclusive), e.g. 2025-07-31"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleListResponse:
    """
    Returns paginated sales ordered newest-first.
    Each item includes client_name and total_items for delivery history cards.
    """
    total, items = await sale_service.list_sales(
        db, client_id, start_date, end_date, offset, limit
    )
    return SaleListResponse(total=total, items=items)


@router.get(
    "/{sale_id}",
    response_model=SaleResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a sale by ID (with line items)",
)
async def get_sale(
    sale_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleResponse:
    sale = await sale_service.get_sale(db, sale_id)
    return _sale_to_response(sale)
