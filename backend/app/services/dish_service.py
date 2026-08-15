# ==========================================================================
# Purpose: Dish Service
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
from uuid import UUID

from app.repositories.dish_repository import IDishRepository
from app.schemas.dish import DishResponse

# ==========================================================================
# Log
# ==========================================================================
logger = logging.getLogger(__name__)


# ==========================================================================
# CLASSES / DATA STRUCTURE: DishService
# ==========================================================================
class DishService:
    def __init__(self, repo: IDishRepository) -> None:
        self.repo = repo

    async def get_by_id(self, dish_id: UUID) -> DishResponse | None:
        dish = await self.repo.get_by_id(dish_id)
        if not dish:
            logger.error("...")
            return None
        return dish
