# ==========================================================================
# Purpose: Database-Only Restaurant Lookup Policy
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import asyncio
import logging
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.repositories.dish_repository import IDishRepository
from app.repositories.province_repository import IProvinceRepository
from app.repositories.restaurant_dish_repository import IRestaurantDishRepository
from app.schemas.restaurant import RestaurantDishResponse

# ==========================================================================
# Log | PARAMETERS
# ==========================================================================
logger = logging.getLogger(__name__)


# ==========================================================================
# Class: RestaurantService
# ==========================================================================
class RestaurantService:
    def __init__(
        self,
        restaurant_dish_repo: IRestaurantDishRepository,
        dish_repo: IDishRepository,
        province_repo: IProvinceRepository,
    ) -> None:
        self.restaurant_dish_repo = restaurant_dish_repo
        self.dish_repo = dish_repo
        self.province_repo = province_repo

    # ======================================================================
    # Function: Get Stored Restaurants for a Dish and Province
    # ======================================================================
    async def get_by_dish_and_province(
        self,
        dish_id: UUID,
        province_id: UUID,
    ) -> list[RestaurantDishResponse]:
        dish, province = await asyncio.gather(
            self.dish_repo.get_by_id(dish_id),
            self.province_repo.get_by_id(province_id),
        )

        if dish is None:
            logger.info("Dish not found for restaurant lookup: %s", dish_id)
            raise NotFoundError("Dish not found")
        if province is None:
            logger.info("Province not found for restaurant lookup: %s", province_id)
            raise NotFoundError("Province not found")

        relationships = await self.restaurant_dish_repo.get_by_dish_and_province(
            dish_id,
            province_id,
        )

        return list(
            {
                relationship.google_place_id: relationship
                for relationship in relationships
            }.values()
        )
