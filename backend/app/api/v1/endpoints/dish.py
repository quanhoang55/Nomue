# ==========================================================================
# Purpose: Dish
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_dish_service
from app.schemas.dish import DishResponse
from app.services.dish_service import DishService

# ==========================================================================
# PARAMETERS
# ==========================================================================
router = APIRouter(prefix="/dishes", tags=["Dishes"])
DishServiceDep = Annotated[
    DishService,
    Depends(get_dish_service),
]


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================
@router.get("", response_model=list[DishResponse])
async def get_dishes(
    province_id: UUID,
    service: DishServiceDep,
) -> list[DishResponse]:
    return await service.get_by_province(province_id)


@router.get("/{dish_id}", response_model=DishResponse)
async def get_dish(dish_id: UUID, service: DishServiceDep) -> DishResponse:
    return await service.get_by_id(dish_id)
