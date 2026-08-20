# ==========================================================================
# Purpose: Synchronize Verified Auth Identities with Application Profiles
# ==========================================================================
from app.core.security import AuthenticatedUser
from app.repositories.user_repository import IUserRepository
from app.schemas.user import UserResponse


class AuthService:
    def __init__(self, user_repo: IUserRepository) -> None:
        self.user_repo = user_repo

    async def bootstrap(self, current_user: AuthenticatedUser) -> UserResponse:
        display_name = self._get_display_name(current_user)
        profile = await self.user_repo.create_if_missing(
            current_user.id,
            display_name=display_name,
        )
        return UserResponse(
            **profile.model_dump(),
            email=current_user.email,
        )

    @staticmethod
    def _get_display_name(current_user: AuthenticatedUser) -> str | None:
        for key in ("display_name", "full_name", "name"):
            value = current_user.user_metadata.get(key)
            if isinstance(value, str):
                normalized = " ".join(value.split())
                if normalized:
                    return normalized[:100]
        return None
