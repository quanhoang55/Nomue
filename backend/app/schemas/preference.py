# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import RequestModel, ResponseModel


class PreferenceFields(RequestModel):
    spice_preference: int = Field(ge=0, le=5)
    sweetness_preference: int = Field(ge=0, le=5)
    sourness_preference: int = Field(ge=0, le=5)
    adventurous_preference: int = Field(ge=0, le=5)
    max_price: int | None = Field(default=None, ge=0)
    vegetarian: bool = False
    vegan: bool = False
    no_pork: bool = False
    no_beef: bool = False
    no_seafood: bool = False
    halal_preference: bool = False
    allergy_preference: str | None = None


class PreferenceCreate(PreferenceFields):
    pass


class PreferenceUpdate(RequestModel):
    spice_preference: int | None = Field(default=None, ge=0, le=5)
    sweetness_preference: int | None = Field(default=None, ge=0, le=5)
    sourness_preference: int | None = Field(default=None, ge=0, le=5)
    adventurous_preference: int | None = Field(default=None, ge=0, le=5)
    max_price: int | None = Field(default=None, ge=0)
    vegetarian: bool | None = None
    vegan: bool | None = None
    no_pork: bool | None = None
    no_beef: bool | None = None
    no_seafood: bool | None = None
    halal_preference: bool | None = None
    allergy_preference: str | None = None


class PreferenceResponse(ResponseModel):
    id: UUID
    user_id: UUID
    spice_preference: int = Field(ge=0, le=5)
    sweetness_preference: int = Field(ge=0, le=5)
    sourness_preference: int = Field(ge=0, le=5)
    adventurous_preference: int = Field(ge=0, le=5)
    max_price: int | None = Field(default=None, ge=0)
    vegetarian: bool
    vegan: bool
    no_pork: bool
    no_beef: bool
    no_seafood: bool
    halal_preference: bool
    allergy_preference: str | None = None
    created_at: datetime
    updated_at: datetime
