# ==========================================================================
# Purpose: Restaurant Endpoints
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_restaurant_service
from app.schemas.restaurant import RestaurantDishResponse
from app.services.restaurant_service import RestaurantService

# ==========================================================================
# PARAMETERS
# ==========================================================================
router = APIRouter(prefix="/restaurants", tags=["Restaurants"])
RestaurantServiceDep = Annotated[
    RestaurantService,
    Depends(get_restaurant_service),
]


# ==========================================================================
# Function: Get Stored Restaurants for a Dish and Province
# ==========================================================================
@router.get("", response_model=list[RestaurantDishResponse])
async def get_restaurants(
    dish_id: UUID,
    province_id: UUID,
    service: RestaurantServiceDep,
) -> list[RestaurantDishResponse]:
    return await service.get_by_dish_and_province(dish_id, province_id)
