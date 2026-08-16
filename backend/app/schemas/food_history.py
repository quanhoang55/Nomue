# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from datetime import datetime
from uuid import UUID

from app.schemas.common import RequestModel, ResponseModel

# ==========================================================================
# CLASSES / DATA STRUCTURE: FoodHistoryCreate
# ==========================================================================


class FoodHistoryCreate(RequestModel):
    dish_id: UUID


# ==========================================================================
# CLASSES / DATA STRUCTURE: FoodHistoryResponse
# ==========================================================================


class FoodHistoryResponse(ResponseModel):
    id: UUID
    user_id: UUID
    dish_id: UUID
    created_at: datetime
