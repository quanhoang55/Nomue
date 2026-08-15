# ==========================================================================
# Purpose: Dish Feature Response
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ==========================================================================
# CLASSES / DATA STRUCTURE: DishResponse
# ==========================================================================
class DishResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None

    spice_level: int = Field(ge=0, le=5)
    sweetness_level: int = Field(ge=0, le=5)
    sourness_level: int = Field(ge=0, le=5)
    bitterness_level: int = Field(ge=0, le=5)
    adventurous_level: int = Field(ge=0, le=5)

    typical_price: int = Field(ge=0)

    model_config = ConfigDict(
        extra="ignore",
    )
