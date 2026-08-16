# ==========================================================================
# Purpose: Location-Related Dish Lookups
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_dish_service
from app.services.dish_service import DishService

router = APIRouter(prefix="/locations", tags=["Locations"])
DishServiceDep = Annotated[DishService, Depends(get_dish_service)]


@router.get("/{province_id}/dish-ids", response_model=list[UUID])
async def get_dish_ids_by_province(
    province_id: UUID,
    service: DishServiceDep,
) -> list[UUID]:
    return await service.get_dish_ids_by_province(province_id)
