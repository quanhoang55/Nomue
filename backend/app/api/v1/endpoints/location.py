# ==========================================================================
# Purpose: Location-Related Dish Lookups
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_dish_service, get_location_service
from app.schemas.location import LocationResolveRequest, ResolvedLocation
from app.services.dish_service import DishService
from app.services.location_service import LocationService

router = APIRouter(prefix="/locations", tags=["Locations"])
DishServiceDep = Annotated[DishService, Depends(get_dish_service)]
LocationServiceDep = Annotated[LocationService, Depends(get_location_service)]


@router.post("/resolve", response_model=ResolvedLocation)
async def resolve_location(
    request: LocationResolveRequest,
    service: LocationServiceDep,
) -> ResolvedLocation:
    return await service.resolve(request)


@router.get("/{province_id}/dish-ids", response_model=list[UUID])
async def get_dish_ids_by_province(
    province_id: UUID,
    service: DishServiceDep,
) -> list[UUID]:
    return await service.get_dish_ids_by_province(province_id)
