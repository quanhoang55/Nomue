# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas.common import ResponseModel


class SubscriptionPlanResponse(ResponseModel):
    id: UUID
    name: str
    revenuecat_entitlement_id: str
    revenuecat_offering_id: str | None = None
    price: Decimal = Field(ge=0)
    duration_days: int = Field(ge=0)
    daily_ai_limit: int = Field(ge=0)
    weekly_ai_limit: int = Field(ge=0)
    monthly_ai_limit: int = Field(ge=0)
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserSubscriptionResponse(ResponseModel):
    id: UUID
    user_id: UUID
    plan_id: UUID
    revenuecat_app_user_id: str
    entitlement_id: str
    status: str
    started_at: datetime
    expires_at: datetime | None = None
    cancelled_at: datetime | None = None
    last_synced_at: datetime
    created_at: datetime
    updated_at: datetime


class SubscriptionStatus(ResponseModel):
    plan_name: str
    status: str
    expires_at: datetime | None = None
    daily_ai_remaining: int = Field(ge=0)
    weekly_ai_remaining: int = Field(ge=0)
    monthly_ai_remaining: int = Field(ge=0)
