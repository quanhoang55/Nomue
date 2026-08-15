# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from uuid import UUID

from pydantic import Field

from app.schemas.common import RequestModel, ResponseModel


class DishFields(RequestModel):
    name: str = Field(min_length=1)
    description: str | None = None
    spice_level: int = Field(ge=0, le=5)
    sweetness_level: int = Field(ge=0, le=5)
    sourness_level: int = Field(ge=0, le=5)
    bitterness_level: int = Field(ge=0, le=5)
    adventurous_level: int = Field(ge=0, le=5)
    typical_price: int = Field(ge=0)


class DishCreate(DishFields):
    pass


class DishUpdate(RequestModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    spice_level: int | None = Field(default=None, ge=0, le=5)
    sweetness_level: int | None = Field(default=None, ge=0, le=5)
    sourness_level: int | None = Field(default=None, ge=0, le=5)
    bitterness_level: int | None = Field(default=None, ge=0, le=5)
    adventurous_level: int | None = Field(default=None, ge=0, le=5)
    typical_price: int | None = Field(default=None, ge=0)


class DishResponse(ResponseModel):
    id: UUID
    name: str
    description: str | None = None
    spice_level: int = Field(ge=0, le=5)
    sweetness_level: int = Field(ge=0, le=5)
    sourness_level: int = Field(ge=0, le=5)
    bitterness_level: int = Field(ge=0, le=5)
    adventurous_level: int = Field(ge=0, le=5)
    typical_price: int = Field(ge=0)


class DishProvinceResponse(ResponseModel):
    id: UUID
    dish_id: UUID
    province_id: UUID
    important_score: int
