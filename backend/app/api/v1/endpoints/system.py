# ==========================================================================
# Purpose: Protected Internal System Endpoints
# ==========================================================================
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import (
    get_restaurant_discovery_service,
    require_system_api_key,
)
from app.schemas.restaurant import (
    RestaurantDishSaveRequest,
    RestaurantDishSaveResponse,
)
from app.services.restaurant_discovery_service import RestaurantDiscoveryService

router = APIRouter(prefix="/system", tags=["System"])
RestaurantDiscoveryServiceDep = Annotated[
    RestaurantDiscoveryService,
    Depends(get_restaurant_discovery_service),
]
SystemAuthDep = Annotated[None, Depends(require_system_api_key)]


@router.post(
    "/restaurant-dishes",
    response_model=RestaurantDishSaveResponse,
)
async def save_restaurant_dishes(
    request: RestaurantDishSaveRequest,
    service: RestaurantDiscoveryServiceDep,
    _authorization: SystemAuthDep,
) -> RestaurantDishSaveResponse:
    return await service.save_relationships(request)
