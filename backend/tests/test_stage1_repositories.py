from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, MagicMock, call
from uuid import UUID

from app.repositories.dish_province_repository import DishProvinceRepository
from app.repositories.dish_repository import DishRepository
from app.repositories.province_repository import ProvinceRepository

DISH_ID_1 = UUID("11111111-1111-4111-8111-111111111111")
DISH_ID_2 = UUID("22222222-2222-4222-8222-222222222222")
PROVINCE_ID = UUID("33333333-3333-4333-8333-333333333333")


def dish_row(dish_id: UUID, name: str) -> dict[str, object]:
    return {
        "id": str(dish_id),
        "name": name,
        "description": None,
        "spice_level": 1,
        "sweetness_level": 2,
        "sourness_level": 3,
        "bitterness_level": 0,
        "adventurous_level": 2,
        "typical_price": 50_000,
    }


def query_for(data: object) -> tuple[MagicMock, MagicMock]:
    query = MagicMock()
    query.select.return_value = query
    query.eq.return_value = query
    query.in_.return_value = query
    query.maybe_single.return_value = query
    query.order.return_value = query
    query.limit.return_value = query
    query.execute = AsyncMock(return_value=SimpleNamespace(data=data))

    db = MagicMock()
    db.table.return_value = query
    return db, query


class DishRepositoryTests(IsolatedAsyncioTestCase):
    async def test_get_by_ids_uses_one_bounded_query(self) -> None:
        db, query = query_for(
            [dish_row(DISH_ID_2, "Second"), dish_row(DISH_ID_1, "First")]
        )
        repository = DishRepository(db)

        dishes = await repository.get_by_ids([DISH_ID_1, DISH_ID_2])

        self.assertEqual([dish.id for dish in dishes], [DISH_ID_2, DISH_ID_1])
        db.table.assert_called_once_with("dish")
        query.in_.assert_called_once_with("id", [str(DISH_ID_1), str(DISH_ID_2)])
        query.limit.assert_called_once_with(2)

    async def test_get_by_ids_skips_database_for_empty_input(self) -> None:
        db = MagicMock()
        repository = DishRepository(db)

        self.assertEqual(await repository.get_by_ids([]), [])
        db.table.assert_not_called()


class ProvinceRepositoryTests(IsolatedAsyncioTestCase):
    async def test_get_by_id_returns_none_when_no_row_exists(self) -> None:
        db, _query = query_for(None)

        province = await ProvinceRepository(db).get_by_id(PROVINCE_ID)

        self.assertIsNone(province)
        db.table.assert_called_once_with("province")


class DishProvinceRepositoryTests(IsolatedAsyncioTestCase):
    async def test_ids_are_queried_in_deterministic_rank_order(self) -> None:
        db, query = query_for(
            [{"dish_id": str(DISH_ID_2)}, {"dish_id": str(DISH_ID_1)}]
        )

        dish_ids = await DishProvinceRepository(db).get_dish_ids_by_province(
            PROVINCE_ID
        )

        self.assertEqual(dish_ids, [DISH_ID_2, DISH_ID_1])
        db.table.assert_called_once_with("dish_province")
        self.assertEqual(
            query.order.call_args_list,
            [call("importance_score", desc=True), call("dish_id")],
        )
        query.limit.assert_called_once()
