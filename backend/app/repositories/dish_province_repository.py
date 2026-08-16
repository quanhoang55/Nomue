# ==========================================================================
# Purpose: Dish-Province Relationship Data Access
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
from abc import ABC, abstractmethod
from typing import override
from uuid import UUID

from supabase import AsyncClient

from app.core.constants import MAX_PAGE_SIZE
from app.core.exceptions import DatabaseError

logger = logging.getLogger(__name__)


class IDishProvinceRepository(ABC):
    @abstractmethod
    async def get_dish_ids_by_province(self, province_id: UUID) -> list[UUID]:
        pass


class DishProvinceRepository(IDishProvinceRepository):
    def __init__(self, db: AsyncClient) -> None:
        self.db = db

    @override
    async def get_dish_ids_by_province(self, province_id: UUID) -> list[UUID]:
        logger.debug("Fetching dish IDs for province: %s", province_id)
        try:
            response = await (
                self.db.table("dish_province")
                .select("dish_id")
                .eq("province_id", str(province_id))
                .order("importance_score", desc=True)
                .order("dish_id")
                .limit(MAX_PAGE_SIZE)
                .execute()
            )
            if response is None or response.data is None:
                return []
            return [UUID(str(row["dish_id"])) for row in response.data]
        except (KeyError, TypeError, ValueError) as exc:
            logger.exception(
                "Invalid dish-province data returned for province: %s", province_id
            )
            raise DatabaseError(
                "The database returned invalid dish-province data"
            ) from exc
        except Exception as exc:
            logger.exception(
                "Database error while fetching dishes for province: %s", province_id
            )
            raise DatabaseError("Could not load province dishes") from exc
