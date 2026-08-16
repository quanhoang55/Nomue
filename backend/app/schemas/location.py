# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from typing import Self
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.schemas.common import RequestModel, ResponseModel


class ProvinceCreate(RequestModel):
    name: str = Field(min_length=1)


class ProvinceResponse(ResponseModel):
    id: UUID
    name: str


class LocalAreaCreate(RequestModel):
    province_id: UUID
    name: str = Field(min_length=1)
    area_type: str = Field(min_length=1)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class LocalAreaResponse(ResponseModel):
    id: UUID
    province_id: UUID
    name: str
    area_type: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class LocationResolveRequest(RequestModel):
    text: str | None = Field(default=None, min_length=1, max_length=200)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("text")
    @classmethod
    def normalize_text_input(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("text must not be blank")
        return normalized

    @model_validator(mode="after")
    def validate_resolution_method(self) -> Self:
        has_text = self.text is not None
        has_latitude = self.latitude is not None
        has_longitude = self.longitude is not None

        if has_latitude != has_longitude:
            raise ValueError("latitude and longitude must be provided together")
        if has_text == has_latitude:
            raise ValueError("provide either text or GPS coordinates")
        return self


class ResolvedLocation(ResponseModel):
    province: ProvinceResponse
    local_area: LocalAreaResponse | None = None
