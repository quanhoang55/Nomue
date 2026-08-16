# ==========================================================================
# Purpose: Local-Area Data Access
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import Any, override
from uuid import UUID

from pydantic import ValidationError
from supabase import AsyncClient

from app.core.exceptions import DatabaseError
from app.schemas.location import LocalAreaResponse

logger = logging.getLogger(__name__)

LOCAL_AREA_SELECT_COLUMNS = "id,province_id,name,area_type,latitude,longitude"
LOCAL_AREA_PROVINCE_PAGE_SIZE = 200
LOCATION_CANDIDATE_PAGE_SIZE = 200


class ILocalAreaRepository(ABC):
    @abstractmethod
    async def get_by_id(self, local_area_id: UUID) -> LocalAreaResponse | None:
        pass

    @abstractmethod
    async def list_for_province(self, province_id: UUID) -> list[LocalAreaResponse]:
        pass

    @abstractmethod
    async def list_candidates(self) -> list[LocalAreaResponse]:
        pass


class LocalAreaRepository(ILocalAreaRepository):
    def __init__(self, db: AsyncClient) -> None:
        self.db = db

    @override
    async def get_by_id(self, local_area_id: UUID) -> LocalAreaResponse | None:
        try:
            response = await (
                self.db.table("local_area")
                .select(LOCAL_AREA_SELECT_COLUMNS)
                .eq("id", str(local_area_id))
                .maybe_single()
                .execute()
            )
            if response is None or response.data is None:
                return None
            return LocalAreaResponse.model_validate(response.data)
        except ValidationError as exc:
            logger.exception(
                "Invalid local-area data returned for ID: %s", local_area_id
            )
            raise DatabaseError(
                "The database returned invalid local-area data"
            ) from exc
        except Exception as exc:
            logger.exception(
                "Database error while fetching local-area ID: %s", local_area_id
            )
            raise DatabaseError("Could not load local-area data") from exc

    @override
    async def list_for_province(self, province_id: UUID) -> list[LocalAreaResponse]:
        return await self._list(
            lambda query: query.eq("province_id", str(province_id)),
            page_size=LOCAL_AREA_PROVINCE_PAGE_SIZE,
        )

    @override
    async def list_candidates(self) -> list[LocalAreaResponse]:
        return await self._list(
            lambda query: query,
            page_size=LOCATION_CANDIDATE_PAGE_SIZE,
        )

    async def _list(
        self,
        apply_filters: Callable[[Any], Any],
        *,
        page_size: int,
    ) -> list[LocalAreaResponse]:
        try:
            areas: list[LocalAreaResponse] = []
            offset = 0
            while True:
                query = self.db.table("local_area").select(LOCAL_AREA_SELECT_COLUMNS)
                query = apply_filters(query)
                response = await (
                    query.order("name")
                    .order("id")
                    .range(offset, offset + page_size - 1)
                    .execute()
                )
                rows = [] if response is None or response.data is None else response.data
                areas.extend(LocalAreaResponse.model_validate(row) for row in rows)
                if len(rows) < page_size:
                    return areas
                offset += page_size
        except ValidationError as exc:
            logger.exception("Invalid local-area collection returned by database")
            raise DatabaseError(
                "The database returned invalid local-area data"
            ) from exc
        except Exception as exc:
            logger.exception("Database error while fetching local areas")
            raise DatabaseError("Could not load local-area data") from exc
