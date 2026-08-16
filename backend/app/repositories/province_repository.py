# ==========================================================================
# Purpose: Province Data Access
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
from abc import ABC, abstractmethod
from typing import override
from uuid import UUID

from pydantic import ValidationError
from supabase import AsyncClient

from app.core.exceptions import DatabaseError
from app.schemas.location import ProvinceResponse

logger = logging.getLogger(__name__)
PROVINCE_CANDIDATE_PAGE_SIZE = 100


class IProvinceRepository(ABC):
    @abstractmethod
    async def get_by_id(self, province_id: UUID) -> ProvinceResponse | None:
        pass

    @abstractmethod
    async def list_all(self) -> list[ProvinceResponse]:
        pass


class ProvinceRepository(IProvinceRepository):
    def __init__(self, db: AsyncClient) -> None:
        self.db = db

    @override
    async def get_by_id(self, province_id: UUID) -> ProvinceResponse | None:
        logger.debug("Fetching province with ID: %s", province_id)
        try:
            response = await (
                self.db.table("province")
                .select("id,name")
                .eq("id", str(province_id))
                .maybe_single()
                .execute()
            )
            if response is None or response.data is None:
                return None
            return ProvinceResponse.model_validate(response.data)
        except ValidationError as exc:
            logger.exception("Invalid province data returned for ID: %s", province_id)
            raise DatabaseError("The database returned invalid province data") from exc
        except Exception as exc:
            logger.exception(
                "Database error while fetching province ID: %s", province_id
            )
            raise DatabaseError("Could not load province data") from exc

    @override
    async def list_all(self) -> list[ProvinceResponse]:
        try:
            provinces: list[ProvinceResponse] = []
            offset = 0
            while True:
                response = await (
                    self.db.table("province")
                    .select("id,name")
                    .order("name")
                    .order("id")
                    .range(
                        offset,
                        offset + PROVINCE_CANDIDATE_PAGE_SIZE - 1,
                    )
                    .execute()
                )
                rows = [] if response is None or response.data is None else response.data
                provinces.extend(ProvinceResponse.model_validate(row) for row in rows)
                if len(rows) < PROVINCE_CANDIDATE_PAGE_SIZE:
                    return provinces
                offset += PROVINCE_CANDIDATE_PAGE_SIZE
        except ValidationError as exc:
            logger.exception("Invalid province collection returned by database")
            raise DatabaseError("The database returned invalid province data") from exc
        except Exception as exc:
            logger.exception("Database error while fetching provinces")
            raise DatabaseError("Could not load province data") from exc
