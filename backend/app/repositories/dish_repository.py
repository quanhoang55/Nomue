# ==========================================================================
# Purpose: Fetch Data From Supabase
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
from abc import ABC, abstractmethod
from typing import override
from uuid import UUID

from pydantic import ValidationError
from supabase import AsyncClient

from app.schemas.dish import DishResponse

# ==========================================================================
# Log
# ==========================================================================
logger = logging.getLogger(__name__)


# ==========================================================================
# Interface
# ==========================================================================
class IDishRepository(ABC):
    @abstractmethod
    async def get_by_id(self, dish_id: UUID) -> DishResponse | None:
        pass


# ==========================================================================
# CLASSES / DATA STRUCTURE: DishRepository
# ==========================================================================
class DishRepository(IDishRepository):
    def __init__(self, db: AsyncClient):
        self.db = db

    @override
    async def get_by_id(self, dish_id: UUID) -> DishResponse | None:
        logger.info(f"Fetching dish data from database with ID: {dish_id}")
        try:
            response = await (
                self.db.table("dish")
                .select("*")
                .eq("id", str(dish_id))
                .maybe_single()
                .execute()
            )
            if response is None:
                logger.info(
                    "Dish not found for ID: %s",
                    dish_id,
                )
                return None
            if response.data is None:
                logger.info(
                    "Dish not found for ID: %s",
                    dish_id,
                )
                return None

            return DishResponse.model_validate(response.data)

        except ValidationError:
            logger.exception(
                "Dish schema validation failed for ID: %s",
                dish_id,
            )
            raise

        except Exception:
            logger.exception(
                "Database error while fetching dish ID: %s",
                dish_id,
            )
            raise
