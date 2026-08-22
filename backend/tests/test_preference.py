from datetime import UTC, datetime
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.dependencies import get_current_user, get_preference_service
from app.core.exceptions import NotFoundError
from app.main import app
from app.repositories.preference_repository import (
    PREFERENCE_SELECT_COLUMNS,
    IPreferenceRepository,
    PreferenceRepository,
)
from app.schemas.preference import PreferenceResponse, PreferenceUpdate
from app.services.preference_service import PreferenceService

USER_ID = UUID("11111111-1111-4111-8111-111111111111")
OTHER_USER_ID = UUID("22222222-2222-4222-8222-222222222222")
PREFERENCE_ID = UUID("33333333-3333-4333-8333-333333333333")
NOW = datetime(2026, 8, 22, tzinfo=UTC)


def preference_row() -> dict[str, object]:
    return {
        "id": str(PREFERENCE_ID),
        "user_id": str(USER_ID),
        "spice_preference": 3,
        "sweetness_preference": 2,
        "sourness_preference": 1,
        "adventurous_preference": 4,
        "vegetarian": False,
        "vegan": False,
        "no_pork": True,
        "no_beef": False,
        "no_seafood": False,
        "halal_preference": False,
        "allergy_preference": "Peanuts",
        "created_at": NOW.isoformat(),
        "updated_at": NOW.isoformat(),
    }


def make_preference() -> PreferenceResponse:
    return PreferenceResponse.model_validate(preference_row())


def query_for(data: object) -> tuple[MagicMock, MagicMock]:
    query = MagicMock()
    query.select.return_value = query
    query.eq.return_value = query
    query.update.return_value = query
    query.maybe_single.return_value = query
    query.execute = AsyncMock(return_value=SimpleNamespace(data=data))
    db = MagicMock()
    db.table.return_value = query
    return db, query


class PreferenceUpdateSchemaTests(TestCase):
    def test_rejects_empty_update(self) -> None:
        with self.assertRaises(ValidationError):
            PreferenceUpdate()

    def test_rejects_null_for_non_nullable_field(self) -> None:
        with self.assertRaises(ValidationError):
            PreferenceUpdate(spice_preference=None)

    def test_allows_clearing_nullable_fields(self) -> None:
        update = PreferenceUpdate(allergy_preference=None)

        self.assertEqual(
            update.model_dump(exclude_unset=True),
            {"allergy_preference": None},
        )


class PreferenceRepositoryTests(IsolatedAsyncioTestCase):
    async def test_get_is_scoped_to_user_id(self) -> None:
        db, query = query_for(preference_row())

        preference = await PreferenceRepository(db).get_by_user_id(USER_ID)

        self.assertEqual(preference, make_preference())
        self.assertIsNone(preference.max_price)
        db.table.assert_called_once_with("user_preference")
        query.select.assert_called_once_with(PREFERENCE_SELECT_COLUMNS)
        query.eq.assert_called_once_with("user_id", str(USER_ID))
        query.maybe_single.assert_called_once_with()

    async def test_get_returns_none_when_preferences_do_not_exist(self) -> None:
        db, _query = query_for(None)

        preference = await PreferenceRepository(db).get_by_user_id(USER_ID)

        self.assertIsNone(preference)

    async def test_update_writes_only_supplied_fields_for_user(self) -> None:
        db, query = query_for([preference_row()])
        repository = PreferenceRepository(db)
        repository.get_by_user_id = AsyncMock(return_value=make_preference())
        update = PreferenceUpdate(spice_preference=5, no_pork=False)

        preference = await repository.update_by_user_id(USER_ID, update)

        self.assertEqual(preference, make_preference())
        query.update.assert_called_once_with(
            {"spice_preference": 5, "no_pork": False}
        )
        query.eq.assert_called_once_with("user_id", str(USER_ID))
        repository.get_by_user_id.assert_awaited_once_with(USER_ID)


class PreferenceServiceTests(IsolatedAsyncioTestCase):
    async def test_get_uses_authenticated_user_id(self) -> None:
        repository = MagicMock(spec=IPreferenceRepository)
        repository.get_by_user_id = AsyncMock(return_value=make_preference())
        service = PreferenceService(repository)

        preference = await service.get_for_user(USER_ID)

        self.assertEqual(preference.user_id, USER_ID)
        repository.get_by_user_id.assert_awaited_once_with(USER_ID)

    async def test_update_raises_when_preferences_do_not_exist(self) -> None:
        repository = MagicMock(spec=IPreferenceRepository)
        repository.update_by_user_id = AsyncMock(return_value=None)
        service = PreferenceService(repository)

        with self.assertRaisesRegex(NotFoundError, "User preferences not found"):
            await service.update_for_user(
                USER_ID,
                PreferenceUpdate(spice_preference=4),
            )


class FakePreferenceService:
    def __init__(self) -> None:
        self.preference = make_preference()
        self.requested_user_id: UUID | None = None
        self.received_update: PreferenceUpdate | None = None
        self.missing = False

    async def get_for_user(self, user_id: UUID) -> PreferenceResponse:
        self.requested_user_id = user_id
        if self.missing:
            raise NotFoundError("User preferences not found")
        return self.preference

    async def update_for_user(
        self,
        user_id: UUID,
        update: PreferenceUpdate,
    ) -> PreferenceResponse:
        self.requested_user_id = user_id
        self.received_update = update
        if self.missing:
            raise NotFoundError("User preferences not found")
        return self.preference


class PreferenceApiTests(TestCase):
    def setUp(self) -> None:
        self.service = FakePreferenceService()
        app.dependency_overrides[get_preference_service] = lambda: self.service
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=USER_ID)
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    def test_get_returns_all_preferences_for_authenticated_user(self) -> None:
        response = self.client.get("/api/v1/preferences/me")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user_id"], str(USER_ID))
        self.assertEqual(response.json()["spice_preference"], 3)
        self.assertIsNone(response.json()["max_price"])
        self.assertEqual(self.service.requested_user_id, USER_ID)

    def test_patch_uses_authenticated_user_and_partial_body(self) -> None:
        response = self.client.patch(
            "/api/v1/preferences/me",
            json={"spice_preference": 5, "no_pork": False},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.service.requested_user_id, USER_ID)
        self.assertEqual(
            self.service.received_update.model_dump(exclude_unset=True),
            {"spice_preference": 5, "no_pork": False},
        )

    def test_patch_rejects_undeployed_max_price_field(self) -> None:
        response = self.client.patch(
            "/api/v1/preferences/me",
            json={"max_price": 200_000},
        )

        self.assertEqual(response.status_code, 422)

    def test_patch_rejects_client_supplied_user_id(self) -> None:
        response = self.client.patch(
            "/api/v1/preferences/me",
            json={
                "user_id": str(OTHER_USER_ID),
                "spice_preference": 5,
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_patch_rejects_out_of_range_level(self) -> None:
        response = self.client.patch(
            "/api/v1/preferences/me",
            json={"spice_preference": 6},
        )

        self.assertEqual(response.status_code, 422)

    def test_missing_preferences_return_404(self) -> None:
        self.service.missing = True

        response = self.client.get("/api/v1/preferences/me")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error_code"], "not_found")

    def test_endpoint_requires_authentication(self) -> None:
        app.dependency_overrides.pop(get_current_user)

        response = self.client.get("/api/v1/preferences/me")

        self.assertEqual(response.status_code, 401)
