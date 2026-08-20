import time
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, patch
from uuid import UUID

from fastapi.testclient import TestClient

from app.api.dependencies import get_auth_service, get_current_user
from app.core.config import settings
from app.core.exceptions import AuthenticationError
from app.core.security import AuthenticatedUser, _validate_claims
from app.main import app
from app.schemas.user import UserProfile, UserResponse
from app.services.auth_service import AuthService

USER_ID = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
SESSION_ID = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")


def make_current_user() -> AuthenticatedUser:
    return AuthenticatedUser(
        sub=USER_ID,
        aud="authenticated",
        exp=4_102_444_800,
        iss="https://example.supabase.co/auth/v1",
        role="authenticated",
        iat=1_700_000_000,
        session_id=SESSION_ID,
        email="traveler@example.com",
        user_metadata={"display_name": "  Test   Traveler  "},
        is_anonymous=False,
    )


def make_profile() -> UserProfile:
    return UserProfile(
        id=USER_ID,
        username=None,
        display_name="Traveler",
        country_code=None,
        preferred_language="en",
        status="active",
    )


class FakeUserRepository:
    def __init__(self) -> None:
        self.requested_user_id: UUID | None = None
        self.requested_display_name: str | None = None

    async def get_by_id(self, _user_id: UUID) -> UserProfile | None:
        return make_profile()

    async def create_if_missing(
        self,
        user_id: UUID,
        display_name: str | None = None,
    ) -> UserProfile:
        self.requested_user_id = user_id
        self.requested_display_name = display_name
        return make_profile()


class AuthServiceTests(IsolatedAsyncioTestCase):
    async def test_bootstrap_uses_verified_subject_and_identity_email(self) -> None:
        repository = FakeUserRepository()
        service = AuthService(repository)

        response = await service.bootstrap(make_current_user())

        self.assertEqual(repository.requested_user_id, USER_ID)
        self.assertEqual(repository.requested_display_name, "Test Traveler")
        self.assertEqual(response.id, USER_ID)
        self.assertEqual(response.email, "traveler@example.com")


class FakeAuthService:
    async def bootstrap(self, current_user: AuthenticatedUser) -> UserResponse:
        return UserResponse(**make_profile().model_dump(), email=current_user.email)


class AuthApiTests(TestCase):
    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_bootstrap_requires_authentication(self) -> None:
        app.dependency_overrides[get_auth_service] = FakeAuthService
        with TestClient(app) as client:
            response = client.post("/api/v1/auth/bootstrap")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error_code"], "authentication_error")

    def test_bootstrap_returns_application_profile(self) -> None:
        app.dependency_overrides[get_current_user] = make_current_user
        app.dependency_overrides[get_auth_service] = FakeAuthService
        with TestClient(app) as client:
            response = client.post("/api/v1/auth/bootstrap")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], str(USER_ID))
        self.assertEqual(response.json()["email"], "traveler@example.com")


class CurrentUserDependencyTests(IsolatedAsyncioTestCase):
    async def test_current_user_verifies_bearer_token(self) -> None:
        expected = make_current_user()
        with patch(
            "app.api.dependencies.verify_access_token",
            new=AsyncMock(return_value=expected),
        ) as verify:
            result = await get_current_user("Bearer one.two.three")

        self.assertEqual(result, expected)
        verify.assert_awaited_once_with("one.two.three")


class AuthenticatedClaimsTests(TestCase):
    def make_claims(self, *, is_anonymous: bool) -> dict[str, object]:
        now = int(time.time())
        return {
            "sub": str(USER_ID),
            "aud": settings.jwt_audience,
            "exp": now + 3_600,
            "iss": settings.supabase_jwt_issuer,
            "role": "authenticated",
            "iat": now - 10,
            "session_id": str(SESSION_ID),
            "is_anonymous": is_anonymous,
        }

    def test_permanent_user_claims_are_accepted(self) -> None:
        user = _validate_claims(
            self.make_claims(is_anonymous=False),
            "ES256",
        )

        self.assertFalse(user.is_anonymous)

    def test_anonymous_user_claims_are_rejected(self) -> None:
        with self.assertRaises(AuthenticationError):
            _validate_claims(
                self.make_claims(is_anonymous=True),
                "ES256",
            )

    def test_missing_anonymous_claim_is_rejected(self) -> None:
        claims = self.make_claims(is_anonymous=False)
        del claims["is_anonymous"]

        with self.assertRaises(AuthenticationError):
            _validate_claims(claims, "ES256")
