# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.common import RequestModel, ResponseModel

# ==========================================================================
# CLASSES / DATA STRUCTURE: UserCreate
# ==========================================================================


class UserCreate(RequestModel):
    email: EmailStr
    display_name: str = Field(min_length=1)
    username: str | None = Field(default=None, min_length=1)
    country_code: str | None = Field(default=None, min_length=1)
    preferred_language: str = Field(min_length=2)
    # status: str = Field(min_length=1)


# ==========================================================================
# CLASSES / DATA STRUCTURE: UserUpdate
# ==========================================================================


class UserUpdate(RequestModel):
    username: str | None = Field(default=None, min_length=1)
    display_name: str | None = Field(default=None, min_length=1)
    country_code: str | None = Field(default=None, min_length=1)
    preferred_language: str | None = Field(default=None, min_length=2)
    # status: str | None = Field(default=None, min_length=1)


# ==========================================================================
# CLASSES / DATA STRUCTURE: UserResponse
# ==========================================================================


class UserResponse(ResponseModel):
    id: UUID
    username: str | None = None
    email: EmailStr
    display_name: str
    country_code: str | None = None
    preferred_language: str
    status: str
