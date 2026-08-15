# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================

from typing import Any

from pydantic import Field

from app.schemas.common import RequestModel, ResponseModel
from app.schemas.dish import DishResponse
from app.schemas.restaurant import RestaurantResponse


class ChatRequest(RequestModel):
    message: str = Field(min_length=1)
    conversation_id: str | None = Field(default=None, min_length=1)


class ChatResponse(ResponseModel):
    reply_text: str
    recommended_dishes: list[DishResponse] = Field(default_factory=list)
    recommended_restaurants: list[RestaurantResponse] = Field(default_factory=list)
    extracted_preferences: dict[str, Any] | None = None
    reasoning: str | None = None
