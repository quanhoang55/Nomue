# ==========================================================================
# Purpose: Application User Profile Data Access
# ==========================================================================
import logging
from abc import ABC, abstractmethod
from typing import override
from uuid import UUID

from pydantic import ValidationError
from supabase import AsyncClient

from app.core.exceptions import DatabaseError
from app.schemas.user import UserProfile

logger = logging.getLogger(__name__)

USER_SELECT_COLUMNS = "id,username,display_name,country_code,preferred_language,status"


class IUserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> UserProfile | None:
        pass

    @abstractmethod
    async def create_if_missing(
        self,
        user_id: UUID,
        display_name: str | None = None,
    ) -> UserProfile:
        pass


class UserRepository(IUserRepository):
    def __init__(self, db: AsyncClient) -> None:
        self.db = db

    @override
    async def get_by_id(self, user_id: UUID) -> UserProfile | None:
        try:
            response = await (
                self.db.table("user")
                .select(USER_SELECT_COLUMNS)
                .eq("id", str(user_id))
                .maybe_single()
                .execute()
            )
            if response is None or response.data is None:
                return None
            return UserProfile.model_validate(response.data)
        except ValidationError as exc:
            logger.exception("Invalid application user profile for ID: %s", user_id)
            raise DatabaseError("The database returned invalid user data") from exc
        except Exception as exc:
            logger.exception("Database error while fetching application user")
            raise DatabaseError("Could not load user profile") from exc

    @override
    async def create_if_missing(
        self,
        user_id: UUID,
        display_name: str | None = None,
    ) -> UserProfile:
        existing = await self.get_by_id(user_id)
        if existing is not None:
            return existing

        try:
            new_profile: dict[str, str] = {"id": str(user_id)}
            if display_name:
                new_profile["display_name"] = display_name
            await (
                self.db.table("user")
                .upsert(
                    new_profile,
                    on_conflict="id",
                    ignore_duplicates=True,
                )
                .execute()
            )
            created = await self.get_by_id(user_id)
            if created is None:
                raise DatabaseError("Could not create user profile")
            return created
        except DatabaseError:
            raise
        except Exception as exc:
            logger.exception("Database error while creating application user")
            raise DatabaseError("Could not create user profile") from exc
