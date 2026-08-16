# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import ResponseModel

# ==========================================================================
# CLASSES / DATA STRUCTURE: RestaurantDishResponse
# ==========================================================================


class RestaurantDishResponse(ResponseModel):
    id: UUID
    google_place_id: str
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
