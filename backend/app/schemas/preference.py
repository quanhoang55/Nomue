# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.schemas.common import RequestModel, ResponseModel

# ==========================================================================
# CLASSES / DATA STRUCTURE: PreferenceFields
# ==========================================================================


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
    allergy_preference: str | None = Field(default=None, max_length=500)

    @field_validator("allergy_preference")
    @classmethod
    def normalize_allergy_preference(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None


# ==========================================================================
# CLASSES / DATA STRUCTURE: PreferenceCreate
# ==========================================================================


class PreferenceCreate(PreferenceFields):
    pass


# ==========================================================================
# CLASSES / DATA STRUCTURE: PreferenceUpdate
# ==========================================================================


class PreferenceUpdate(RequestModel):
    spice_preference: int | None = Field(default=None, ge=0, le=5)
    sweetness_preference: int | None = Field(default=None, ge=0, le=5)
    sourness_preference: int | None = Field(default=None, ge=0, le=5)
    adventurous_preference: int | None = Field(default=None, ge=0, le=5)
    vegetarian: bool | None = None
    vegan: bool | None = None
    no_pork: bool | None = None
    no_beef: bool | None = None
    no_seafood: bool | None = None
    halal_preference: bool | None = None
    allergy_preference: str | None = Field(default=None, max_length=500)

    @field_validator("allergy_preference")
    @classmethod
    def normalize_allergy_preference(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None

    @model_validator(mode="after")
    def validate_partial_update(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("at least one preference field is required")

        nullable_fields = {"allergy_preference"}
        for field_name in self.model_fields_set - nullable_fields:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


# ==========================================================================
# CLASSES / DATA STRUCTURE: PreferenceResponse
# ==========================================================================
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
