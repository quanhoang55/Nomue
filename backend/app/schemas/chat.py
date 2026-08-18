# ==========================================================================
# Purpose: Backward-Compatible Chat Schema Imports
# ==========================================================================
from app.schemas.chat_schema import (
    ChatBackendContext,
    ChatDishRecommendation,
    ChatGeminiResponse,
    ChatLocationContext,
    ChatLocationInterpretation,
    ChatRequest,
    ChatResponse,
    GeminiDishRecommendation,
    MapsGroundedPlace,
    MapsGroundingAttribution,
    MapsGroundingContext,
    MapsGroundingSource,
    NearbyPlaceRecommendation,
)

__all__ = [
    "ChatBackendContext",
    "ChatDishRecommendation",
    "ChatGeminiResponse",
    "ChatLocationContext",
    "ChatLocationInterpretation",
    "ChatRequest",
    "ChatResponse",
    "GeminiDishRecommendation",
    "MapsGroundedPlace",
    "MapsGroundingAttribution",
    "MapsGroundingContext",
    "MapsGroundingSource",
    "NearbyPlaceRecommendation",
]
