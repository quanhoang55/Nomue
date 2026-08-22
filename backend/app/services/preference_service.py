import logging
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.repositories.preference_repository import IPreferenceRepository
from app.schemas.preference import PreferenceResponse, PreferenceUpdate

logger = logging.getLogger(__name__)


class PreferenceService:
    def __init__(self, preference_repo: IPreferenceRepository) -> None:
        self.preference_repo = preference_repo

    async def get_for_user(self, user_id: UUID) -> PreferenceResponse:
        preference = await self.preference_repo.get_by_user_id(user_id)
        if preference is None:
            logger.info("Preferences not found for authenticated user: %s", user_id)
            raise NotFoundError("User preferences not found")
        return preference

    async def update_for_user(
        self,
        user_id: UUID,
        update: PreferenceUpdate,
    ) -> PreferenceResponse:
        preference = await self.preference_repo.update_by_user_id(user_id, update)
        if preference is None:
            logger.info("Preferences not found for authenticated user: %s", user_id)
            raise NotFoundError("User preferences not found")
        return preference
