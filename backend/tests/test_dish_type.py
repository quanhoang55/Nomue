from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

from fastapi.testclient import TestClient

from app.api.dependencies import get_dish_type_service
from app.core.exceptions import NotFoundError
from app.main import app
from app.repositories.dish_type_repository import (
    DishTypeRepository,
    IDishTypeRepository,
)
from app.schemas.dish_type import DishTypeResponse
from app.services.dish_type_service import DishTypeService

DISH_TYPE_ID = UUID("55555555-5555-4555-8555-555555555555")


def query_for(data: object) -> tuple[MagicMock, MagicMock]:
    query = MagicMock()
    query.select.return_value = query
    query.eq.return_value = query
    query.maybe_single.return_value = query
    query.execute = AsyncMock(return_value=SimpleNamespace(data=data))

    db = MagicMock()
    db.table.return_value = query
    return db, query


class DishTypeRepositoryTests(IsolatedAsyncioTestCase):
    async def test_get_by_id_returns_name(self) -> None:
        db, query = query_for({"name": "Soup"})

        dish_type = await DishTypeRepository(db).get_by_id(DISH_TYPE_ID)

        self.assertEqual(dish_type, DishTypeResponse(name="Soup"))
        db.table.assert_called_once_with("dish_type")
        query.select.assert_called_once_with("name")
        query.eq.assert_called_once_with("id", str(DISH_TYPE_ID))
        query.maybe_single.assert_called_once_with()

    async def test_get_by_id_returns_none_when_missing(self) -> None:
        db, _query = query_for(None)

        dish_type = await DishTypeRepository(db).get_by_id(DISH_TYPE_ID)

        self.assertIsNone(dish_type)


class DishTypeServiceTests(IsolatedAsyncioTestCase):
    async def test_get_by_id_returns_repository_result(self) -> None:
        repository = MagicMock(spec=IDishTypeRepository)
        repository.get_by_id = AsyncMock(
            return_value=DishTypeResponse(name="Noodle dish")
        )
        service = DishTypeService(repository)

        dish_type = await service.get_by_id(DISH_TYPE_ID)

        self.assertEqual(dish_type.name, "Noodle dish")
        repository.get_by_id.assert_awaited_once_with(DISH_TYPE_ID)

    async def test_get_by_id_raises_when_missing(self) -> None:
        repository = MagicMock(spec=IDishTypeRepository)
        repository.get_by_id = AsyncMock(return_value=None)
        service = DishTypeService(repository)

        with self.assertRaisesRegex(NotFoundError, "Dish type not found"):
            await service.get_by_id(DISH_TYPE_ID)


class FakeDishTypeService:
    def __init__(self) -> None:
        self.missing = False
        self.name = "Soup"

    async def get_by_id(self, _dish_type_id: UUID) -> DishTypeResponse:
        if self.missing:
            raise NotFoundError("Dish type not found")
        return DishTypeResponse(name=self.name)


class DishTypeApiTests(TestCase):
    def setUp(self) -> None:
        self.service = FakeDishTypeService()
        app.dependency_overrides[get_dish_type_service] = lambda: self.service
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    def test_get_dish_type_returns_name(self) -> None:
        response = self.client.get(f"/api/v1/dish-types/{DISH_TYPE_ID}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"name": "Soup"})

    def test_get_dish_type_image_name_returns_normalized_name(self) -> None:
        self.service.name = "Savory Cakes & Dumplings"

        response = self.client.get(
            f"/api/v1/dish-types/image-name/{DISH_TYPE_ID}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"name": "savory_cakes_dumplings"})

    def test_unknown_dish_type_returns_404(self) -> None:
        self.service.missing = True

        response = self.client.get(f"/api/v1/dish-types/{DISH_TYPE_ID}")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json(),
            {"detail": "Dish type not found", "error_code": "not_found"},
        )

    def test_invalid_dish_type_id_returns_422(self) -> None:
        response = self.client.get("/api/v1/dish-types/not-a-uuid")

        self.assertEqual(response.status_code, 422)
