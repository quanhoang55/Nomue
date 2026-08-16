from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.repositories.dish_province_repository import IDishProvinceRepository
from app.repositories.dish_repository import IDishRepository
from app.repositories.province_repository import IProvinceRepository
from app.schemas.dish import DishResponse
from app.schemas.location import ProvinceResponse
from app.services.dish_service import DishService


DISH_ID_1 = UUID("11111111-1111-4111-8111-111111111111")
DISH_ID_2 = UUID("22222222-2222-4222-8222-222222222222")
PROVINCE_ID = UUID("33333333-3333-4333-8333-333333333333")


def make_dish(dish_id: UUID, name: str) -> DishResponse:
    return DishResponse(
        id=dish_id,
        name=name,
        description=None,
        spice_level=1,
        sweetness_level=2,
        sourness_level=3,
        bitterness_level=0,
        adventurous_level=2,
        typical_price=50_000,
    )


def make_service() -> tuple[DishService, MagicMock, MagicMock, MagicMock]:
    dish_repo = MagicMock(spec=IDishRepository)
    province_repo = MagicMock(spec=IProvinceRepository)
    relation_repo = MagicMock(spec=IDishProvinceRepository)
    dish_repo.get_by_id = AsyncMock()
    dish_repo.get_by_ids = AsyncMock()
    province_repo.get_by_id = AsyncMock(
        return_value=ProvinceResponse(id=PROVINCE_ID, name="Test Province")
    )
    relation_repo.get_dish_ids_by_province = AsyncMock()
    return (
        DishService(dish_repo, province_repo, relation_repo),
        dish_repo,
        province_repo,
        relation_repo,
    )


class DishServiceTests(IsolatedAsyncioTestCase):
    async def test_province_dishes_restore_relationship_order(self) -> None:
        service, dish_repo, _province_repo, relation_repo = make_service()
        relation_repo.get_dish_ids_by_province.return_value = [DISH_ID_2, DISH_ID_1]
        dish_repo.get_by_ids.return_value = [
            make_dish(DISH_ID_1, "First"),
            make_dish(DISH_ID_2, "Second"),
        ]

        dishes = await service.get_by_province(PROVINCE_ID)

        self.assertEqual([dish.id for dish in dishes], [DISH_ID_2, DISH_ID_1])
        dish_repo.get_by_ids.assert_awaited_once_with([DISH_ID_2, DISH_ID_1])

    async def test_valid_province_without_dishes_returns_empty_list(self) -> None:
        service, dish_repo, _province_repo, relation_repo = make_service()
        relation_repo.get_dish_ids_by_province.return_value = []

        self.assertEqual(await service.get_by_province(PROVINCE_ID), [])
        dish_repo.get_by_ids.assert_not_awaited()

    async def test_unknown_province_raises_not_found(self) -> None:
        service, _dish_repo, province_repo, relation_repo = make_service()
        province_repo.get_by_id.return_value = None

        with self.assertRaisesRegex(NotFoundError, "Province not found"):
            await service.get_by_province(PROVINCE_ID)
        relation_repo.get_dish_ids_by_province.assert_not_awaited()

    async def test_unknown_dish_raises_not_found(self) -> None:
        service, dish_repo, _province_repo, _relation_repo = make_service()
        dish_repo.get_by_id.return_value = None

        with self.assertRaisesRegex(NotFoundError, "Dish not found"):
            await service.get_by_id(DISH_ID_1)
