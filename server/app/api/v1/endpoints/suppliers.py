"""
api/v1/endpoints/suppliers.py
Supplier CRUD endpoints.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.supplier import (
    SupplierCreateRequest,
    SupplierListResponse,
    SupplierResponse,
    SupplierUpdateRequest,
)
from app.services import supplier_service

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new supplier",
)
async def create_supplier(
    payload: SupplierCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SupplierResponse:
    supplier = await supplier_service.create_supplier(db, payload)
    return SupplierResponse.model_validate(supplier)


@router.get(
    "",
    response_model=SupplierListResponse,
    status_code=status.HTTP_200_OK,
    summary="List / search suppliers",
)
async def list_suppliers(
    search: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SupplierListResponse:
    total, items = await supplier_service.list_suppliers(db, search, offset, limit)
    return SupplierListResponse(
        total=total,
        items=[SupplierResponse.model_validate(s) for s in items],
    )


@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a supplier by ID",
)
async def get_supplier(
    supplier_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SupplierResponse:
    supplier = await supplier_service.get_supplier(db, supplier_id)
    return SupplierResponse.model_validate(supplier)


@router.patch(
    "/{supplier_id}",
    response_model=SupplierResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update a supplier",
)
async def update_supplier(
    supplier_id: uuid.UUID,
    payload: SupplierUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SupplierResponse:
    supplier = await supplier_service.update_supplier(db, supplier_id, payload)
    return SupplierResponse.model_validate(supplier)


@router.delete(
    "/{supplier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a supplier",
)
async def delete_supplier(
    supplier_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    await supplier_service.delete_supplier(db, supplier_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
