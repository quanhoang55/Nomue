# ==========================================================================
# Purpose: HTTP Chat and Gemini Structured-Output Schemas
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from typing import Any, Literal, Self
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    field_validator,
    model_validator,
)

from app.schemas.common import RequestModel, ResponseModel
from app.schemas.dish import DishResponse
from app.schemas.location import (
    LocalAreaResponse,
    LocationResolveRequest,
    ProvinceResponse,
)


# ==========================================================================
# Class: ChatRequest
# ==========================================================================
class ChatRequest(RequestModel):
    message: str = Field(min_length=1, max_length=2_000)
    location: LocationResolveRequest | None = None
    location_source: Literal["user_selected", "device_gps"] | None = None

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("message must not be blank")
        return normalized

    @model_validator(mode="after")
    def validate_location_source(self) -> Self:
        if self.location is None and self.location_source is not None:
            raise ValueError("location_source requires location")
        if (
            self.location_source == "device_gps"
            and self.location is not None
            and self.location.latitude is None
        ):
            raise ValueError("device_gps requires latitude and longitude")
        return self


# ==========================================================================
# Class: Semantic Location Mention Extracted from a Chat Message
# ==========================================================================
class ChatLocationInterpretation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location: LocationResolveRequest | None = None


# ==========================================================================
# Class: ChatLocationContext
# ==========================================================================
class ChatLocationContext(ResponseModel):
    province: ProvinceResponse
    local_area: LocalAreaResponse | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    coordinate_source: Literal["gps", "resolved_local_area"] | None = None
    selection_source: Literal[
        "message",
        "user_selected",
        "device_gps",
        "legacy_request",
    ]

    @model_validator(mode="after")
    def validate_coordinates(self) -> Self:
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        if self.latitude is None and self.coordinate_source is not None:
            raise ValueError("coordinate_source requires coordinates")
        if self.latitude is not None and self.coordinate_source is None:
            raise ValueError("coordinates require coordinate_source")
        return self


# ==========================================================================
# Class: ChatBackendContext
# ==========================================================================
class ChatBackendContext(ResponseModel):
    location: ChatLocationContext | None = None
    candidate_dishes: list[DishResponse]
    user_preferences: dict[str, Any] | None = None
    maps_context: "MapsGroundingContext | None" = None


# ==========================================================================
# Class: MapsGroundingSource
# ==========================================================================
class MapsGroundingSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=300)
    uri: HttpUrl | None = None
    google_place_id: str | None = Field(default=None, min_length=1, max_length=255)
    review_id: str | None = Field(default=None, min_length=1, max_length=255)


# ==========================================================================
# Class: MapsGroundedPlace
# ==========================================================================
class MapsGroundedPlace(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, max_length=200)
    google_place_id: str | None = Field(default=None, min_length=1, max_length=255)
    google_maps_uri: HttpUrl | None = None


# ==========================================================================
# Class: MapsGroundingContext
# ==========================================================================
class MapsGroundingContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    grounded_text: str = Field(max_length=8_000)
    places: list[MapsGroundedPlace] = Field(max_length=20)
    sources: list[MapsGroundingSource] = Field(max_length=50)
    widget_context_tokens: list[str] = Field(max_length=10)
    grounding_signatures: list[str] = Field(max_length=10)


# ==========================================================================
# Class: MapsGroundingAttribution
# ==========================================================================
class MapsGroundingAttribution(ResponseModel):
    sources: list[MapsGroundingSource] = Field(max_length=50)
    widget_context_tokens: list[str] = Field(max_length=10)
    grounding_signatures: list[str] = Field(max_length=10)


# ==========================================================================
# Class: GeminiDishRecommendation
# ==========================================================================
class GeminiDishRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dish_id: UUID
    reason: str = Field(min_length=1, max_length=300)


# ==========================================================================
# Class: NearbyPlaceRecommendation
# ==========================================================================
class NearbyPlaceRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    google_place_id: str | None = Field(default=None, min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=200)
    address: str | None = Field(default=None, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    rating: float | None = Field(default=None, ge=0, le=5)
    google_maps_uri: HttpUrl | None = None
    related_dish_ids: list[UUID] = Field(max_length=5)
    reason: str | None = Field(default=None, max_length=300)

    @model_validator(mode="after")
    def validate_coordinates(self) -> Self:
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("place latitude and longitude must be provided together")
        return self


# ==========================================================================
# Class: ChatGeminiResponse
# ==========================================================================
class ChatGeminiResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1, max_length=160)
    paragraph: str = Field(min_length=1, max_length=800)
    recommended_dishes: list[GeminiDishRecommendation] = Field(max_length=5)
    recommended_restaurants: list[NearbyPlaceRecommendation] = Field(max_length=8)


# ==========================================================================
# Class: ChatDishRecommendation
# ==========================================================================
class ChatDishRecommendation(ResponseModel):
    dish: DishResponse
    reason: str = Field(min_length=1, max_length=300)


# ==========================================================================
# Class: ChatResponse
# ==========================================================================
class ChatResponse(ResponseModel):
    summary: str = Field(min_length=1, max_length=160)
    paragraph: str = Field(min_length=1, max_length=800)
    recommended_dishes: list[ChatDishRecommendation] = Field(max_length=5)
    recommended_restaurants: list[NearbyPlaceRecommendation] = Field(max_length=8)
    location: ChatLocationContext | None = None
    maps_grounding: MapsGroundingAttribution | None = None
