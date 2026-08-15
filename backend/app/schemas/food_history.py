# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from datetime import datetime
from uuid import UUID

from app.schemas.common import RequestModel, ResponseModel


class FoodHistoryCreate(RequestModel):
    user_id: UUID
    dish_id: UUID


class FoodHistoryResponse(ResponseModel):
    id: UUID
    user_id: UUID
    dish_id: UUID
    created_at: datetime
