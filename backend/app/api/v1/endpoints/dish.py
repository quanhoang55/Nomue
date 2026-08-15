# ==========================================================================
# Purpose: Dish
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_dish_service
from app.schemas.dish import DishResponse
from app.services.dish_service import DishService

# ==========================================================================
# PARAMETERS
# ==========================================================================
router = APIRouter(prefix="/dish", tags=["Dish"])
DishServiceDep = Annotated[
    DishService,
    Depends(get_dish_service),
]


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================
@router.get("/{dish_id}", response_model=DishResponse)
async def get_dish(dish_id: UUID, service: DishServiceDep) -> DishResponse:
    dish = await service.get_by_id(dish_id)

    if dish is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dish Not Found"
        )
    return dish
