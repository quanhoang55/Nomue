# ==========================================================================
# Purpose: Dish Service
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.repositories.dish_province_repository import IDishProvinceRepository
from app.repositories.dish_repository import IDishRepository
from app.repositories.province_repository import IProvinceRepository
from app.schemas.dish import DishResponse

# ==========================================================================
# Log
# ==========================================================================
logger = logging.getLogger(__name__)


# ==========================================================================
# CLASSES / DATA STRUCTURE: DishService
# ==========================================================================
class DishService:
    def __init__(
        self,
        dish_repo: IDishRepository,
        province_repo: IProvinceRepository,
        dish_province_repo: IDishProvinceRepository,
    ) -> None:
        self.dish_repo = dish_repo
        self.province_repo = province_repo
        self.dish_province_repo = dish_province_repo

    async def get_by_id(self, dish_id: UUID) -> DishResponse:
        dish = await self.dish_repo.get_by_id(dish_id)
        if dish is None:
            logger.info("Dish not found for ID: %s", dish_id)
            raise NotFoundError("Dish not found")
        return dish

    async def get_by_province(self, province_id: UUID) -> list[DishResponse]:
        ordered_ids = await self.get_dish_ids_by_province(province_id)
        if not ordered_ids:
            return []

        dishes = await self.dish_repo.get_by_ids(ordered_ids)
        dishes_by_id = {dish.id: dish for dish in dishes}
        return [
            dishes_by_id[dish_id] for dish_id in ordered_ids if dish_id in dishes_by_id
        ]

    async def get_dish_ids_by_province(self, province_id: UUID) -> list[UUID]:
        province = await self.province_repo.get_by_id(province_id)
        if province is None:
            logger.info("Province not found for ID: %s", province_id)
            raise NotFoundError("Province not found")

        return await self.dish_province_repo.get_dish_ids_by_province(
            province_id
        )
