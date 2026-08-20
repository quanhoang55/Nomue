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
    id: UUID


# ==========================================================================
# CLASSES / DATA STRUCTURE: UserUpdate
# ==========================================================================


class UserUpdate(RequestModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    preferred_language: str | None = Field(default=None, min_length=2, max_length=10)


# ==========================================================================
# CLASSES / DATA STRUCTURE: UserResponse
# ==========================================================================


class UserProfile(ResponseModel):
    id: UUID
    username: str | None = None
    display_name: str
    country_code: str | None = None
    preferred_language: str
    status: str


class UserResponse(UserProfile):
    email: EmailStr | None = None
