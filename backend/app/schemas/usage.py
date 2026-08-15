# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import RequestModel, ResponseModel


class UsageEventCreate(RequestModel):
    user_id: UUID
    usage_type: str = Field(min_length=1)
    amount: int = Field(default=1, gt=0)


class UsageEventResponse(ResponseModel):
    id: UUID
    user_id: UUID
    usage_type: str
    amount: int = Field(gt=0)
    created_at: datetime
