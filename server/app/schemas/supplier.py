"""
schemas/supplier.py
Pydantic v2 schemas for Supplier CRUD.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SupplierCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    contact_info: str | None = Field(None, max_length=1000)


class SupplierUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    contact_info: str | None = Field(None, max_length=1000)


class SupplierResponse(BaseModel):
    id: uuid.UUID
    name: str
    contact_info: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SupplierListResponse(BaseModel):
    total: int
    items: list[SupplierResponse]
