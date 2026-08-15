# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class RequestModel(BaseModel):
    """Base model for API input DTOs."""

    model_config = ConfigDict(extra="forbid")


class ResponseModel(BaseModel):
    """Base model for API output DTOs built from database or service data."""

    model_config = ConfigDict(extra="ignore", from_attributes=True)


class PaginatedResponse(ResponseModel, Generic[T]):
    items: list[T]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)


class ErrorResponse(ResponseModel):
    detail: str
    error_code: str | None = None
