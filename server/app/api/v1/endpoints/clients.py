"""
api/v1/endpoints/clients.py
Client CRUD endpoints with search and pagination.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.client import (
    ClientCreateRequest,
    ClientListResponse,
    ClientResponse,
    ClientUpdateRequest,
)
from app.services import client_service

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post(
    "",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new client",
)
async def create_client(
    payload: ClientCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ClientResponse:
    client = await client_service.create_client(db, payload)
    return ClientResponse.model_validate(client)


@router.get(
    "",
    response_model=ClientListResponse,
    status_code=status.HTTP_200_OK,
    summary="List / search clients",
)
async def list_clients(
    search: str | None = Query(None, description="Filter by name or phone"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ClientListResponse:
    total, items = await client_service.list_clients(db, search, offset, limit)
    return ClientListResponse(
        total=total,
        items=[ClientResponse.model_validate(c) for c in items],
    )


@router.get(
    "/{client_id}",
    response_model=ClientResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a client by ID",
)
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ClientResponse:
    client = await client_service.get_client(db, client_id)
    return ClientResponse.model_validate(client)


@router.patch(
    "/{client_id}",
    response_model=ClientResponse,
    status_code=status.HTTP_200_OK,
    summary="Partially update a client",
)
async def update_client(
    client_id: uuid.UUID,
    payload: ClientUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ClientResponse:
    client = await client_service.update_client(db, client_id, payload)
    return ClientResponse.model_validate(client)


@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a client",
)
async def delete_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    await client_service.delete_client(db, client_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
