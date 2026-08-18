# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.schemas.common import RequestModel, ResponseModel
from app.schemas.location import LocationResolveRequest


# ==========================================================================
# CLASSES / DATA STRUCTURE: Grounded Restaurant Discovery
# ==========================================================================
class RestaurantDiscoveryRequest(RequestModel):
    dish_id: UUID
    location: LocationResolveRequest


class DiscoveredRestaurant(BaseModel):
    model_config = ConfigDict(extra="forbid")

    google_place_id: str = Field(min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=200)
    address: str | None = Field(default=None, max_length=500)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    rating: float | None = Field(default=None, ge=0, le=5)
    google_maps_uri: HttpUrl | None = None
    reason: str | None = Field(default=None, max_length=300)


class GeminiRestaurantDiscovery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    restaurants: list[DiscoveredRestaurant] = Field(max_length=7)


# ==========================================================================
# CLASSES / DATA STRUCTURE: System Persistence
# ==========================================================================
class RestaurantDishSaveRequest(RequestModel):
    dish_id: UUID
    province_id: UUID
    local_area_id: UUID | None = None
    google_place_ids: list[str] = Field(min_length=1, max_length=7)

    @field_validator("google_place_ids")
    @classmethod
    def normalize_google_place_ids(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        for value in values:
            place_id = value.strip()
            if not place_id:
                raise ValueError("google_place_ids must not contain blank values")
            if len(place_id) > 255:
                raise ValueError("google_place_ids must not exceed 255 characters")
            normalized.append(place_id)
        return list(dict.fromkeys(normalized))


class RestaurantDishSaveResponse(ResponseModel):
    requested_count: int = Field(ge=0, le=7)
    created_count: int = Field(ge=0, le=7)
    existing_count: int = Field(ge=0, le=7)
    google_place_ids: list[str] = Field(max_length=7)

# ==========================================================================
# CLASSES / DATA STRUCTURE: RestaurantDishResponse
# ==========================================================================


class RestaurantDishResponse(ResponseModel):
    id: UUID
    google_place_id: str = Field(min_length=1, max_length=255)
    dish_id: UUID
    province_id: UUID
    local_area_id: UUID | None = None
    last_verified_at: datetime | None = None


# ==========================================================================
# CLASSES / DATA STRUCTURE: RestaurantResponse
# ==========================================================================


class RestaurantResponse(ResponseModel):
    google_place_id: str
    name: str
    rating: float | None = Field(default=None, ge=0, le=5)
    address: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    opening_status: str | None = None
    dish_id: UUID
    last_verified_at: datetime | None = None
    source: Literal["db", "places_api"]


# ==========================================================================
# CLASSES / DATA STRUCTURE: MapPin
# ==========================================================================


class MapPin(ResponseModel):
    google_place_id: str
    name: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    rating: float | None = Field(default=None, ge=0, le=5)


# Backward-compatible name for code that imported the earlier model.
Restaurant = RestaurantResponse
