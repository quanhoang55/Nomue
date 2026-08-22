import logging
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.repositories.dish_type_repository import IDishTypeRepository
from app.schemas.dish_type import DishTypeResponse

logger = logging.getLogger(__name__)


class DishTypeService:
    def __init__(self, dish_type_repo: IDishTypeRepository) -> None:
        self.dish_type_repo = dish_type_repo

    async def get_by_id(self, dish_type_id: UUID) -> DishTypeResponse:
        dish_type = await self.dish_type_repo.get_by_id(dish_type_id)
        if dish_type is None:
            logger.info("Dish type not found for ID: %s", dish_type_id)
            raise NotFoundError("Dish type not found")
        return dish_type
