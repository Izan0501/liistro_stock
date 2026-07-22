"""
api/v1/endpoints/products.py
Product CRUD, stock adjustment, and low-stock filter endpoints.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.product import (
    ProductCreateRequest,
    ProductListResponse,
    ProductResponse,
    ProductUpdateRequest,
    StockAdjustRequest,
)
from app.services import product_service

router = APIRouter(prefix="/products", tags=["Products"])


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
)
async def create_product(
    payload: ProductCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductResponse:
    product = await product_service.create_product(db, payload)
    return ProductResponse.from_orm_with_margin(product)


@router.get(
    "",
    response_model=ProductListResponse,
    status_code=status.HTTP_200_OK,
    summary="List / search products",
)
async def list_products(
    search: str | None = Query(None, description="Filter by product name"),
    low_stock_only: bool = Query(False, description="Show only products with qty ≤ 5"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductListResponse:
    total, items = await product_service.list_products(
        db, search, low_stock_only, offset, limit
    )
    return ProductListResponse(
        total=total,
        items=[ProductResponse.from_orm_with_margin(p) for p in items],
    )


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a product by ID",
)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductResponse:
    product = await product_service.get_product(db, product_id)
    return ProductResponse.from_orm_with_margin(product)


@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update a product (name / prices)",
)
async def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductResponse:
    product = await product_service.update_product(db, product_id, payload)
    return ProductResponse.from_orm_with_margin(product)


@router.post(
    "/{product_id}/adjust-stock",
    response_model=ProductResponse,
    status_code=status.HTTP_200_OK,
    summary="Manually adjust product stock quantity",
)
async def adjust_stock(
    product_id: uuid.UUID,
    payload: StockAdjustRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductResponse:
    product = await product_service.adjust_stock(db, product_id, payload)
    return ProductResponse.from_orm_with_margin(product)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product",
)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    await product_service.delete_product(db, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
