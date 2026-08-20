# ==========================================================================
# Purpose: Authenticated Application Profile Bootstrap
# ==========================================================================
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import CurrentUserDep, get_auth_service
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


@router.post(
    "/bootstrap",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
async def bootstrap_authenticated_user(
    current_user: CurrentUserDep,
    service: AuthServiceDep,
) -> UserResponse:
    return await service.bootstrap(current_user)


# Apple authentication is intentionally disabled until Apple Developer
# credentials are available. Supabase will own Apple sign-in; a future backend
# endpoint is only needed for provider-token revocation during account deletion.
#
# @router.post("/apple/revoke")
# async def revoke_apple_authorization(...):
#     ...
