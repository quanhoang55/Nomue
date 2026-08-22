from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import CurrentUserDep, get_preference_service
from app.schemas.preference import PreferenceResponse, PreferenceUpdate
from app.services.preference_service import PreferenceService

router = APIRouter(prefix="/preferences", tags=["Preferences"])
PreferenceServiceDep = Annotated[
    PreferenceService,
    Depends(get_preference_service),
]


@router.get("/me", response_model=PreferenceResponse)
async def get_my_preferences(
    current_user: CurrentUserDep,
    service: PreferenceServiceDep,
) -> PreferenceResponse:
    return await service.get_for_user(current_user.id)


@router.patch("/me", response_model=PreferenceResponse)
async def update_my_preferences(
    update: PreferenceUpdate,
    current_user: CurrentUserDep,
    service: PreferenceServiceDep,
) -> PreferenceResponse:
    return await service.update_for_user(current_user.id, update)
