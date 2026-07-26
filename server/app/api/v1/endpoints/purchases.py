"""
api/v1/endpoints/purchases.py
Purchase endpoints — acquiring stock from suppliers.
"""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.purchase import (
    PurchaseCreateRequest,
    PurchaseItemResponse,
    PurchaseListResponse,
    PurchaseResponse,
)
from app.services import purchase_service

router = APIRouter(prefix="/purchases", tags=["Purchases"])


def _purchase_to_response(purchase: object) -> PurchaseResponse:
    from app.models.purchase import Purchase  # local import to avoid circular

    p: Purchase = purchase  # type: ignore[assignment]
    s_name = p.supplier.name if getattr(p, "supplier", None) else None
    
    return PurchaseResponse(
        id=p.id,
        supplier_id=p.supplier_id,
        supplier_name=s_name,
        total_amount=p.total_amount,  # type: ignore[arg-type]
        total_items=sum(i.quantity for i in p.items) if getattr(p, "items", None) else 0,
        status=p.status,
        notes=p.notes,
        purchase_date=p.purchase_date,
        items=[PurchaseItemResponse.from_orm(item) for item in p.items] if getattr(p, "items", None) else [],
    )


@router.post(
    "",
    response_model=PurchaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a purchase and atomically increase stock",
)
async def create_purchase(
    payload: PurchaseCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PurchaseResponse:
    """
    Triggers the ACID transaction:
    - Validates supplier exists
    - Creates Purchase + PurchaseItems
    - Increases product quantities
    - Writes StockMovement (IN) audit entries
    - Decrements FinancialConfig capital
    All-or-nothing: any failure rolls back the entire transaction.
    """
    purchase = await purchase_service.create_purchase(db, payload)
    return _purchase_to_response(purchase)


@router.get(
    "",
    response_model=PurchaseListResponse,
    status_code=status.HTTP_200_OK,
    summary="List purchases with optional date and supplier filters",
)
async def list_purchases(
    supplier_id: uuid.UUID | None = Query(None, description="Filter by supplier UUID"),
    start_date: date | None = Query(None, description="ISO 8601 start date (inclusive)"),
    end_date: date | None = Query(None, description="ISO 8601 end date (inclusive)"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PurchaseListResponse:
    total, items = await purchase_service.list_purchases(
        db, supplier_id, start_date, end_date, offset, limit
    )
    return PurchaseListResponse(total=total, items=items)


@router.get(
    "/{purchase_id}",
    response_model=PurchaseResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a purchase by ID (with line items)",
)
async def get_purchase(
    purchase_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PurchaseResponse:
    purchase = await purchase_service.get_purchase(db, purchase_id)
    return _purchase_to_response(purchase)
