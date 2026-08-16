# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import pyclbr
from uuid import UUID

from pydantic import Field

from app.schemas.common import RequestModel, ResponseModel

# ==========================================================================
# CLASSES / DATA STRUCTURE: DishFields
# ==========================================================================


class DishFields(RequestModel):
    name: str = Field(min_length=1)
    description: str | None = None
    spice_level: int = Field(ge=0, le=5)
    sweetness_level: int = Field(ge=0, le=5)
    sourness_level: int = Field(ge=0, le=5)
    bitterness_level: int = Field(ge=0, le=5)
    adventurous_level: int = Field(ge=0, le=5)
    typical_price: int = Field(ge=0)


# ==========================================================================
# CLASSES / DATA STRUCTURE: DishCreate
# ==========================================================================


class DishCreate(DishFields):
    pass


# ==========================================================================
# CLASSES / DATA STRUCTURE: DishUpdate
# ==========================================================================


class DishUpdate(RequestModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    spice_level: int | None = Field(default=None, ge=0, le=5)
    sweetness_level: int | None = Field(default=None, ge=0, le=5)
    sourness_level: int | None = Field(default=None, ge=0, le=5)
    bitterness_level: int | None = Field(default=None, ge=0, le=5)
    adventurous_level: int | None = Field(default=None, ge=0, le=5)
    typical_price: int | None = Field(default=None, ge=0)


# ==========================================================================
# CLASSES / DATA STRUCTURE: DishResponse
# ==========================================================================


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


# ==========================================================================
# CLASSES / DATA STRUCTURE: DishProvinceResponse
# ==========================================================================


class DishProvinceResponse(ResponseModel):
    id: UUID
    dish_id: UUID
    province_id: UUID
    important_score: int = Field(ge=0, le=5)
