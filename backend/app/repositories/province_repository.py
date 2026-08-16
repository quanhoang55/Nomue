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


class IProvinceRepository(ABC):
    @abstractmethod
    async def get_by_id(self, province_id: UUID) -> ProvinceResponse | None:
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
