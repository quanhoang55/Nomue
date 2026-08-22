from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_dish_type_service
from app.schemas.dish_type import DishTypeResponse
from app.services.dish_type_service import DishTypeService

router = APIRouter(prefix="/dish-types", tags=["Dish Types"])
DishTypeServiceDep = Annotated[
    DishTypeService,
    Depends(get_dish_type_service),
]


@router.get("/{dish_type_id}", response_model=DishTypeResponse)
async def get_dish_type(
    dish_type_id: UUID,
    service: DishTypeServiceDep,
) -> DishTypeResponse:
    return await service.get_by_id(dish_type_id)


@router.get("/image-name/{dish_type_id}", response_model=DishTypeResponse)
async def get_dish_type_image_name(
    dish_type_id: UUID,
    service: DishTypeServiceDep,
) -> DishTypeResponse:
    dish_type = await service.get_by_id(dish_type_id)
    image_name = "_".join(dish_type.name.lower().replace("&", "").split())
    return DishTypeResponse(name=image_name)
