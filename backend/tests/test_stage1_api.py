from unittest import TestCase
from uuid import UUID

from fastapi.testclient import TestClient

from app.api.dependencies import get_dish_service
from app.core.exceptions import NotFoundError
from app.main import app
from app.schemas.dish import DishResponse


DISH_ID = UUID("11111111-1111-4111-8111-111111111111")
PROVINCE_ID = UUID("33333333-3333-4333-8333-333333333333")


def make_dish() -> DishResponse:
    return DishResponse(
        id=DISH_ID,
        name="Phở",
        description="Noodle soup",
        spice_level=1,
        sweetness_level=2,
        sourness_level=1,
        bitterness_level=0,
        adventurous_level=1,
        typical_price=50_000,
    )


class FakeDishService:
    def __init__(self) -> None:
        self.province_result: list[DishResponse] = [make_dish()]
        self.dish_ids_result: list[UUID] = [DISH_ID]
        self.province_missing = False
        self.dish_missing = False

    async def get_by_province(self, _province_id: UUID) -> list[DishResponse]:
        if self.province_missing:
            raise NotFoundError("Province not found")
        return self.province_result

    async def get_by_id(self, _dish_id: UUID) -> DishResponse:
        if self.dish_missing:
            raise NotFoundError("Dish not found")
        return make_dish()

    async def get_dish_ids_by_province(self, _province_id: UUID) -> list[UUID]:
        if self.province_missing:
            raise NotFoundError("Province not found")
        return self.dish_ids_result


class DishApiTests(TestCase):
    def setUp(self) -> None:
        self.service = FakeDishService()
        app.dependency_overrides[get_dish_service] = lambda: self.service
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    def test_list_dishes_for_province(self) -> None:
        response = self.client.get(
            "/api/v1/dishes", params={"province_id": str(PROVINCE_ID)}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["id"], str(DISH_ID))

    def test_valid_province_with_no_dishes_returns_empty_array(self) -> None:
        self.service.province_result = []

        response = self.client.get(
            "/api/v1/dishes", params={"province_id": str(PROVINCE_ID)}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_unknown_province_returns_safe_404(self) -> None:
        self.service.province_missing = True

        response = self.client.get(
            "/api/v1/dishes", params={"province_id": str(PROVINCE_ID)}
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.json(),
            {"detail": "Province not found", "error_code": "not_found"},
        )

    def test_invalid_province_id_returns_422(self) -> None:
        response = self.client.get(
            "/api/v1/dishes", params={"province_id": "not-a-uuid"}
        )

        self.assertEqual(response.status_code, 422)

    def test_get_dish_by_id(self) -> None:
        response = self.client.get(f"/api/v1/dishes/{DISH_ID}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Phở")

    def test_get_dish_ids_by_province(self) -> None:
        response = self.client.get(
            f"/api/v1/locations/{PROVINCE_ID}/dish-ids"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [str(DISH_ID)])

    def test_dish_ids_for_valid_empty_province_returns_empty_array(self) -> None:
        self.service.dish_ids_result = []

        response = self.client.get(
            f"/api/v1/locations/{PROVINCE_ID}/dish-ids"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_dish_ids_for_unknown_province_returns_404(self) -> None:
        self.service.province_missing = True

        response = self.client.get(
            f"/api/v1/locations/{PROVINCE_ID}/dish-ids"
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error_code"], "not_found")

    def test_invalid_location_province_id_returns_422(self) -> None:
        response = self.client.get("/api/v1/locations/not-a-uuid/dish-ids")

        self.assertEqual(response.status_code, 422)
