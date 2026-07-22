"""
schemas/client.py
Pydantic v2 schemas for Client CRUD.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ClientCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    phone: str | None = Field(None, max_length=30)
    address: str | None = Field(None, max_length=500)


class ClientUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    phone: str | None = Field(None, max_length=30)
    address: str | None = Field(None, max_length=500)


class ClientResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str | None
    address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    total: int
    items: list[ClientResponse]
