# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from uuid import UUID

from pydantic import Field

from app.schemas.common import RequestModel, ResponseModel


class UserCreate(RequestModel):
    email: str = Field(min_length=3)
    display_name: str = Field(min_length=1)
    username: str | None = Field(default=None, min_length=1)
    country_code: str | None = Field(default=None, min_length=1)
    preferred_language: str = Field(min_length=2)
    status: str = Field(min_length=1)


class UserUpdate(RequestModel):
    username: str | None = Field(default=None, min_length=1)
    display_name: str | None = Field(default=None, min_length=1)
    country_code: str | None = Field(default=None, min_length=1)
    preferred_language: str | None = Field(default=None, min_length=2)
    status: str | None = Field(default=None, min_length=1)


class UserResponse(ResponseModel):
    id: UUID
    username: str | None = None
    email: str
    display_name: str
    country_code: str | None = None
    preferred_language: str
    status: str
