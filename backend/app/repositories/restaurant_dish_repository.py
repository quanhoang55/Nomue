# ==========================================================================
# Purpose: Restaurant-Dish Relationship Data Access
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
from abc import ABC, abstractmethod
from typing import override
from uuid import UUID

from pydantic import ValidationError
from supabase import AsyncClient

from app.core.constants import MAX_PAGE_SIZE
from app.core.exceptions import DatabaseError
from app.schemas.restaurant import RestaurantDishResponse

# ==========================================================================
# PARAMETERS
# ==========================================================================
logger = logging.getLogger(__name__)

RESTAURANT_DISH_SELECT_COLUMNS = (
    "id,google_place_id,dish_id,province_id,local_area_id,last_verified_at"
)


# ==========================================================================
# Interface: IRestaurantDishRepository
# ==========================================================================
class IRestaurantDishRepository(ABC):
    @abstractmethod
    async def insert_many(
        self,
        google_place_ids: list[str],
        *,
        dish_id: UUID,
        province_id: UUID,
        local_area_id: UUID | None,
    ) -> list[RestaurantDishResponse]:
        pass

    @abstractmethod
    async def get_by_dish_id(
        self,
        dish_id: UUID,
    ) -> list[RestaurantDishResponse]:
        pass

    @abstractmethod
    async def get_by_province_id(
        self,
        province_id: UUID,
    ) -> list[RestaurantDishResponse]:
        pass

    @abstractmethod
    async def get_by_dish_and_province(
        self,
        dish_id: UUID,
        province_id: UUID,
    ) -> list[RestaurantDishResponse]:
        pass


# ==========================================================================
# Class: RestaurantDishRepository
# ==========================================================================
class RestaurantDishRepository(IRestaurantDishRepository):
    def __init__(self, db: AsyncClient) -> None:
        self.db = db

    @override
    async def insert_many(
        self,
        google_place_ids: list[str],
        *,
        dish_id: UUID,
        province_id: UUID,
        local_area_id: UUID | None,
    ) -> list[RestaurantDishResponse]:
        unique_place_ids = list(dict.fromkeys(google_place_ids))
        if not unique_place_ids:
            return []

        rows = [
            {
                "google_place_id": place_id,
                "dish_id": str(dish_id),
                "province_id": str(province_id),
                "local_area_id": (
                    None if local_area_id is None else str(local_area_id)
                ),
            }
            for place_id in unique_place_ids
        ]
        try:
            response = await (
                self.db.table("restaurant_dish").insert(rows).execute()
            )
            if response is None or response.data is None:
                return []
            return [
                RestaurantDishResponse.model_validate(row)
                for row in response.data
            ]
        except ValidationError as exc:
            logger.exception("Invalid saved restaurant relationship data returned")
            raise DatabaseError(
                "The database returned invalid restaurant data"
            ) from exc
        except Exception as exc:
            logger.exception("Database error while saving restaurant relationships")
            raise DatabaseError("Could not save restaurant data") from exc

    @override
    async def get_by_dish_id(
        self,
        dish_id: UUID,
    ) -> list[RestaurantDishResponse]:
        return await self._get(dish_id=dish_id)

    @override
    async def get_by_province_id(
        self,
        province_id: UUID,
    ) -> list[RestaurantDishResponse]:
        return await self._get(province_id=province_id)

    @override
    async def get_by_dish_and_province(
        self,
        dish_id: UUID,
        province_id: UUID,
    ) -> list[RestaurantDishResponse]:
        return await self._get(dish_id=dish_id, province_id=province_id)

    # ======================================================================
    # Function: Execute a Bounded Restaurant-Dish Query
    # ======================================================================
    async def _get(
        self,
        *,
        dish_id: UUID | None = None,
        province_id: UUID | None = None,
    ) -> list[RestaurantDishResponse]:
        if dish_id is None and province_id is None:
            raise ValueError("At least one restaurant filter is required")

        logger.debug(
            "Fetching restaurant references for dish=%s province=%s",
            dish_id,
            province_id,
        )

        try:
            query = self.db.table("restaurant_dish").select(
                RESTAURANT_DISH_SELECT_COLUMNS
            )
            if dish_id is not None:
                query = query.eq("dish_id", str(dish_id))
            if province_id is not None:
                query = query.eq("province_id", str(province_id))

            response = await (
                query.order("google_place_id")
                .order("id")
                .limit(MAX_PAGE_SIZE)
                .execute()
            )
            if response is None or response.data is None:
                return []

            return [
                RestaurantDishResponse.model_validate(row) for row in response.data
            ]
        except ValidationError as exc:
            logger.exception("Invalid restaurant relationship data returned")
            raise DatabaseError(
                "The database returned invalid restaurant data"
            ) from exc
        except Exception as exc:
            logger.exception("Database error while fetching restaurant relationships")
            raise DatabaseError("Could not load restaurant data") from exc
