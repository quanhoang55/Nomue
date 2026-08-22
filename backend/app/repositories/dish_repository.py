# ==========================================================================
# Purpose: Fetch Data From Supabase
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
from abc import ABC, abstractmethod
from collections.abc import Sequence
from typing import override
from uuid import UUID

from pydantic import ValidationError
from supabase import AsyncClient

from app.core.constants import MAX_PAGE_SIZE
from app.core.exceptions import DatabaseError
from app.schemas.dish import DishResponse

# ==========================================================================
# Log and Parameter
# ==========================================================================
logger = logging.getLogger(__name__)

DISH_SELECT_COLUMNS = (
    "id,dish_type_id,name,description,spice_level,sweetness_level,sourness_level,"
    "bitterness_level,adventurous_level,typical_price"
)


# ==========================================================================
# Interface
# ==========================================================================
class IDishRepository(ABC):
    @abstractmethod
    async def get_by_id(self, dish_id: UUID) -> DishResponse | None:
        pass

    @abstractmethod
    async def get_by_ids(self, dish_ids: Sequence[UUID]) -> list[DishResponse]:
        pass


# ==========================================================================
# CLASSES / DATA STRUCTURE: DishRepository
# ==========================================================================
class DishRepository(IDishRepository):
    def __init__(self, db: AsyncClient):
        self.db = db

    @override
    async def get_by_id(self, dish_id: UUID) -> DishResponse | None:
        logger.debug("Fetching dish with ID: %s", dish_id)
        try:
            response = await (
                self.db.table("dish")
                .select(DISH_SELECT_COLUMNS)
                .eq("id", str(dish_id))
                .maybe_single()
                .execute()
            )
            if response is None or response.data is None:
                return None

            return DishResponse.model_validate(response.data)
        except ValidationError as exc:
            logger.exception("Invalid dish data returned for ID: %s", dish_id)
            raise DatabaseError("The database returned invalid dish data") from exc
        except Exception as exc:
            logger.exception("Database error while fetching dish ID: %s", dish_id)
            raise DatabaseError("Could not load dish data") from exc

    @override
    async def get_by_ids(self, dish_ids: Sequence[UUID]) -> list[DishResponse]:
        unique_ids = list(dict.fromkeys(dish_ids))[:MAX_PAGE_SIZE]
        if not unique_ids:
            return []

        logger.debug("Fetching %d dishes", len(unique_ids))
        try:
            response = await (
                self.db.table("dish")
                .select(DISH_SELECT_COLUMNS)
                .in_("id", [str(dish_id) for dish_id in unique_ids])
                .limit(len(unique_ids))
                .execute()
            )
            if response is None or response.data is None:
                return []
            return [DishResponse.model_validate(row) for row in response.data]
        except ValidationError as exc:
            logger.exception("Invalid dish data returned for dish collection")
            raise DatabaseError("The database returned invalid dish data") from exc
        except Exception as exc:
            logger.exception("Database error while fetching dish collection")
            raise DatabaseError("Could not load dish data") from exc
