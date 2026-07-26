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
    SaleItemResponse,
    SaleListResponse,
    SaleResponse,
)
from app.services import sale_service

router = APIRouter(prefix="/sales", tags=["Sales"])


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
    response_model=SaleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a sale and atomically deduct stock",
)
async def create_sale(
    payload: SaleCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleResponse:
    """
    Triggers the ACID transaction:
    - Validates stock for all items
    - Creates Sale + SaleItems
    - Deducts product quantities
    - Writes StockMovement (OUT) audit entries
    - Updates FinancialConfig capital
    All-or-nothing: any failure rolls back the entire transaction.
    """
    sale = await sale_service.create_sale(db, payload)
    return _sale_to_response(sale)


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
