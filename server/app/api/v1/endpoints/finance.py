"""
api/v1/endpoints/finance.py
Capital management endpoints.

GET  /finance/capital         — Returns current FinancialConfig capital.
POST /finance/capital/adjust  — Manually inject or withdraw liquidity.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import CapitalAdjustRequest, CapitalResponse
from app.services import dashboard_service

router = APIRouter(prefix="/finance", tags=["Finance"])


@router.get(
    "/capital",
    response_model=CapitalResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current business capital",
)
async def get_capital(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CapitalResponse:
    """Returns the current value of FinancialConfig.initial_capital."""
    return await dashboard_service.get_capital(db)


@router.post(
    "/capital/adjust",
    response_model=CapitalResponse,
    status_code=status.HTTP_200_OK,
    summary="Manually adjust business capital (add or subtract liquidity)",
)
async def adjust_capital(
    payload: CapitalAdjustRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CapitalResponse:
    """
    Manually inject or withdraw liquidity from the FinancialConfig.

    Payload:
    - **amount**: positive Decimal value to add/subtract
    - **operation**: `"add"` or `"subtract"`
    - **reason**: audit-trail description (3–255 chars)

    Errors:
    - **400** if subtracting would produce a negative capital balance.
    """
    return await dashboard_service.adjust_capital(db, payload)
