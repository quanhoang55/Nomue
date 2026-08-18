from datetime import UTC, datetime
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, MagicMock, call
from uuid import UUID

from fastapi.testclient import TestClient

from app.api.dependencies import get_restaurant_service
from app.core.exceptions import NotFoundError
from app.main import app
from app.repositories.dish_repository import IDishRepository
from app.repositories.province_repository import IProvinceRepository
from app.repositories.restaurant_dish_repository import (
    IRestaurantDishRepository,
    RestaurantDishRepository,
)
from app.schemas.dish import DishResponse
from app.schemas.location import ProvinceResponse
from app.schemas.restaurant import RestaurantDishResponse
from app.services.restaurant_service import RestaurantService

DISH_ID = UUID("11111111-1111-4111-8111-111111111111")
PROVINCE_ID = UUID("33333333-3333-4333-8333-333333333333")
RELATIONSHIP_ID = UUID("66666666-6666-4666-8666-666666666666")


def make_relationship(
    *,
    relationship_id: UUID = RELATIONSHIP_ID,
    google_place_id: str = "test-place-id",
) -> RestaurantDishResponse:
    return RestaurantDishResponse(
        id=relationship_id,
        google_place_id=google_place_id,
        dish_id=DISH_ID,
        province_id=PROVINCE_ID,
        local_area_id=None,
        last_verified_at=datetime(2026, 8, 17, tzinfo=UTC),
    )


def make_dish() -> DishResponse:
    return DishResponse(
        id=DISH_ID,
        name="Phở",
        description=None,
        spice_level=1,
        sweetness_level=1,
        sourness_level=1,
        bitterness_level=0,
        adventurous_level=1,
        typical_price=50_000,
    )


def query_for(data: object) -> tuple[MagicMock, MagicMock]:
    query = MagicMock()
    query.select.return_value = query
    query.eq.return_value = query
    query.order.return_value = query
    query.limit.return_value = query
    query.execute = AsyncMock(return_value=SimpleNamespace(data=data))
    db = MagicMock()
    db.table.return_value = query
    return db, query


class RestaurantDishRepositoryTests(IsolatedAsyncioTestCase):
    async def test_combined_lookup_is_filtered_bounded_and_deterministic(self) -> None:
        row = make_relationship().model_dump(mode="json")
        db, query = query_for([row])

        result = await RestaurantDishRepository(db).get_by_dish_and_province(
            DISH_ID,
            PROVINCE_ID,
        )

        self.assertEqual(result, [make_relationship()])
        db.table.assert_called_once_with("restaurant_dish")
        self.assertEqual(
            query.eq.call_args_list,
            [call("dish_id", str(DISH_ID)), call("province_id", str(PROVINCE_ID))],
        )
        self.assertEqual(
            query.order.call_args_list,
            [call("google_place_id"), call("id")],
        )
        query.limit.assert_called_once()

    async def test_empty_database_result_returns_empty_list(self) -> None:
        db, _query = query_for([])

        result = await RestaurantDishRepository(db).get_by_dish_id(DISH_ID)

        self.assertEqual(result, [])


def make_service() -> tuple[RestaurantService, MagicMock, MagicMock, MagicMock]:
    relationship_repo = MagicMock(spec=IRestaurantDishRepository)
    dish_repo = MagicMock(spec=IDishRepository)
    province_repo = MagicMock(spec=IProvinceRepository)
    relationship_repo.get_by_dish_and_province = AsyncMock(return_value=[])
    dish_repo.get_by_id = AsyncMock(return_value=make_dish())
    province_repo.get_by_id = AsyncMock(
        return_value=ProvinceResponse(id=PROVINCE_ID, name="Hà Nội")
    )
    return (
        RestaurantService(relationship_repo, dish_repo, province_repo),
        relationship_repo,
        dish_repo,
        province_repo,
    )


class RestaurantServiceTests(IsolatedAsyncioTestCase):
    async def test_lookup_returns_only_one_reference_per_place(self) -> None:
        service, relationship_repo, _dish_repo, _province_repo = make_service()
        relationship_repo.get_by_dish_and_province.return_value = [
            make_relationship(),
            make_relationship(
                relationship_id=UUID("77777777-7777-4777-8777-777777777777")
            ),
        ]

        result = await service.get_by_dish_and_province(DISH_ID, PROVINCE_ID)

        self.assertEqual(len(result), 1)
        relationship_repo.get_by_dish_and_province.assert_awaited_once_with(
            DISH_ID,
            PROVINCE_ID,
        )

    async def test_unknown_dish_is_rejected_before_relationship_lookup(self) -> None:
        service, relationship_repo, dish_repo, _province_repo = make_service()
        dish_repo.get_by_id.return_value = None

        with self.assertRaisesRegex(NotFoundError, "Dish not found"):
            await service.get_by_dish_and_province(DISH_ID, PROVINCE_ID)
        relationship_repo.get_by_dish_and_province.assert_not_awaited()

    async def test_unknown_province_is_rejected_before_lookup(self) -> None:
        service, relationship_repo, _dish_repo, province_repo = make_service()
        province_repo.get_by_id.return_value = None

        with self.assertRaisesRegex(NotFoundError, "Province not found"):
            await service.get_by_dish_and_province(DISH_ID, PROVINCE_ID)
        relationship_repo.get_by_dish_and_province.assert_not_awaited()


class FakeRestaurantService:
    async def get_by_dish_and_province(
        self,
        dish_id: UUID,
        province_id: UUID,
    ) -> list[RestaurantDishResponse]:
        if dish_id != DISH_ID:
            raise NotFoundError("Dish not found")
        if province_id != PROVINCE_ID:
            raise NotFoundError("Province not found")
        return [make_relationship()]


class RestaurantApiTests(TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[get_restaurant_service] = FakeRestaurantService
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    def test_get_restaurants_returns_stored_references(self) -> None:
        response = self.client.get(
            "/api/v1/restaurants",
            params={"dish_id": str(DISH_ID), "province_id": str(PROVINCE_ID)},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["google_place_id"], "test-place-id")
        self.assertEqual(response.json()[0]["dish_id"], str(DISH_ID))

    def test_missing_filter_is_rejected(self) -> None:
        response = self.client.get(
            "/api/v1/restaurants",
            params={"dish_id": str(DISH_ID)},
        )

        self.assertEqual(response.status_code, 422)

    def test_invalid_identifier_is_rejected(self) -> None:
        response = self.client.get(
            "/api/v1/restaurants",
            params={"dish_id": "invalid", "province_id": str(PROVINCE_ID)},
        )

        self.assertEqual(response.status_code, 422)
