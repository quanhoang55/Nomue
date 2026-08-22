import logging
from abc import ABC, abstractmethod
from typing import override
from uuid import UUID

from pydantic import ValidationError
from supabase import AsyncClient

from app.core.exceptions import DatabaseError
from app.schemas.dish_type import DishTypeResponse

logger = logging.getLogger(__name__)


class IDishTypeRepository(ABC):
    @abstractmethod
    async def get_by_id(self, dish_type_id: UUID) -> DishTypeResponse | None:
        pass


class DishTypeRepository(IDishTypeRepository):
    def __init__(self, db: AsyncClient) -> None:
        self.db = db

    @override
    async def get_by_id(self, dish_type_id: UUID) -> DishTypeResponse | None:
        logger.debug("Fetching dish type with ID: %s", dish_type_id)
        try:
            response = await (
                self.db.table("dish_type")
                .select("name")
                .eq("id", str(dish_type_id))
                .maybe_single()
                .execute()
            )
            if response is None or response.data is None:
                return None
            return DishTypeResponse.model_validate(response.data)
        except ValidationError as exc:
            logger.exception(
                "Invalid dish type data returned for ID: %s", dish_type_id
            )
            raise DatabaseError("The database returned invalid dish type data") from exc
        except Exception as exc:
            logger.exception(
                "Database error while fetching dish type ID: %s", dish_type_id
            )
            raise DatabaseError("Could not load dish type data") from exc
