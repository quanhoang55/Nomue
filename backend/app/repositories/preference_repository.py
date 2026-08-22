import logging
from abc import ABC, abstractmethod
from typing import override
from uuid import UUID

from pydantic import ValidationError
from supabase import AsyncClient

from app.core.exceptions import DatabaseError
from app.schemas.preference import PreferenceResponse, PreferenceUpdate

logger = logging.getLogger(__name__)

PREFERENCE_SELECT_COLUMNS = (
    "id,user_id,spice_preference,sweetness_preference,sourness_preference,"
    "adventurous_preference,vegetarian,vegan,no_pork,no_beef,"
    "no_seafood,halal_preference,allergy_preference,created_at,updated_at"
)


class IPreferenceRepository(ABC):
    @abstractmethod
    async def get_by_user_id(self, user_id: UUID) -> PreferenceResponse | None:
        pass

    @abstractmethod
    async def update_by_user_id(
        self,
        user_id: UUID,
        update: PreferenceUpdate,
    ) -> PreferenceResponse | None:
        pass


class PreferenceRepository(IPreferenceRepository):
    def __init__(self, db: AsyncClient) -> None:
        self.db = db

    @override
    async def get_by_user_id(self, user_id: UUID) -> PreferenceResponse | None:
        logger.debug("Fetching preferences for authenticated user: %s", user_id)
        try:
            response = await (
                self.db.table("user_preference")
                .select(PREFERENCE_SELECT_COLUMNS)
                .eq("user_id", str(user_id))
                .maybe_single()
                .execute()
            )
            if response is None or response.data is None:
                return None
            return PreferenceResponse.model_validate(response.data)
        except ValidationError as exc:
            logger.exception("Invalid preference data returned for user: %s", user_id)
            raise DatabaseError("The database returned invalid preference data") from exc
        except Exception as exc:
            logger.exception("Database error while fetching user preferences")
            raise DatabaseError("Could not load user preferences") from exc

    @override
    async def update_by_user_id(
        self,
        user_id: UUID,
        update: PreferenceUpdate,
    ) -> PreferenceResponse | None:
        payload = update.model_dump(exclude_unset=True)
        logger.debug("Updating preferences for authenticated user: %s", user_id)
        try:
            response = await (
                self.db.table("user_preference")
                .update(payload)
                .eq("user_id", str(user_id))
                .execute()
            )
            if response is None or not response.data:
                return None
            return await self.get_by_user_id(user_id)
        except DatabaseError:
            raise
        except Exception as exc:
            logger.exception("Database error while updating user preferences")
            raise DatabaseError("Could not update user preferences") from exc
