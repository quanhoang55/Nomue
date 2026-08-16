from types import SimpleNamespace
from math import pi
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, MagicMock, call, patch
from uuid import UUID

from fastapi.testclient import TestClient

from app.api.dependencies import get_location_service
from app.core.exceptions import NotFoundError
from app.main import app
from app.repositories.local_area_repository import (
    ILocalAreaRepository,
    LocalAreaRepository,
)
from app.repositories.province_repository import IProvinceRepository, ProvinceRepository
from app.schemas.location import (
    LocalAreaResponse,
    LocationResolveRequest,
    ProvinceResponse,
    ResolvedLocation,
)
from app.services.location_service import LocationService
from app.utils.geo import EARTH_RADIUS_KM, haversine_distance_km, nearest_local_area
from app.utils.text_location import (
    best_location_name_match,
    location_name_score,
    normalize_location_text,
)

PROVINCE_ID = UUID("33333333-3333-4333-8333-333333333333")
AREA_ID = UUID("44444444-4444-4444-8444-444444444444")
VINH_LONG_ID = UUID("55555555-5555-4555-8555-555555555555")


def make_province(
    name: str = "Nghệ An",
    *,
    province_id: UUID = PROVINCE_ID,
) -> ProvinceResponse:
    return ProvinceResponse(id=province_id, name=name)


def make_area(
    name: str = "Vinh",
    *,
    area_id: UUID = AREA_ID,
    latitude: float = 18.6796,
    longitude: float = 105.6813,
) -> LocalAreaResponse:
    return LocalAreaResponse(
        id=area_id,
        province_id=PROVINCE_ID,
        name=name,
        area_type="Thành phố",
        latitude=latitude,
        longitude=longitude,
    )


class GeoAndTextUtilityTests(TestCase):
    def test_vietnamese_location_text_is_normalized(self) -> None:
        self.assertEqual(normalize_location_text("  Vinh, Nghệ An "), "vinh nghe an")
        self.assertEqual(normalize_location_text("Đà Lạt"), "da lat")

    def test_best_match_supports_unaccented_input(self) -> None:
        provinces = [make_province("Nghệ An"), make_province("Hà Nội")]

        match = best_location_name_match("Vinh, Nghe An", provinces)

        self.assertIsNotNone(match)
        self.assertEqual(match.name, "Nghệ An")

    def test_short_local_name_does_not_partially_match_province(self) -> None:
        self.assertLess(location_name_score("Vinh", "Vĩnh Long"), 0.78)

    def test_identical_coordinates_have_zero_distance(self) -> None:
        self.assertAlmostEqual(
            haversine_distance_km(18.6796, 105.6813, 18.6796, 105.6813),
            0.0,
        )

    def test_known_simple_coordinate_pair(self) -> None:
        self.assertAlmostEqual(haversine_distance_km(0, 0, 1, 0), 111.2, delta=0.2)

    def test_empty_candidate_collection_has_no_nearest_area(self) -> None:
        self.assertIsNone(nearest_local_area(18.68, 105.68, []))

    def test_nearest_candidate_is_selected(self) -> None:
        nearby = make_area()
        distant = make_area("Distant", latitude=20, longitude=106)

        nearest = nearest_local_area(18.68, 105.68, [distant, nearby])

        self.assertIsNotNone(nearest)
        self.assertEqual(nearest[0].name, "Vinh")

    def test_equal_distance_uses_uuid_for_deterministic_tie_breaking(self) -> None:
        larger_id = UUID("55555555-5555-4555-8555-555555555555")
        smaller_id = UUID("11111111-1111-4111-8111-111111111111")
        candidates = [
            make_area("Larger ID", area_id=larger_id),
            make_area("Smaller ID", area_id=smaller_id),
        ]

        nearest = nearest_local_area(18.6796, 105.6813, candidates)

        self.assertIsNotNone(nearest)
        self.assertEqual(nearest[0].id, smaller_id)

    def test_haversine_rounding_above_one_is_clamped(self) -> None:
        with patch(
            "app.utils.geo.sin",
            side_effect=[0.0, 1.000000000001],
        ):
            distance = haversine_distance_km(0, 0, 0, 180)

        self.assertAlmostEqual(distance, pi * EARTH_RADIUS_KM)


class LocalAreaRepositoryTests(IsolatedAsyncioTestCase):
    async def test_candidate_query_fetches_every_deterministic_page(self) -> None:
        query = MagicMock()
        query.select.return_value = query
        query.order.return_value = query
        query.range.return_value = query
        area_row = make_area().model_dump(mode="json")
        query.execute = AsyncMock(
            side_effect=[
                SimpleNamespace(data=[area_row] * 200),
                SimpleNamespace(data=[area_row]),
            ]
        )
        db = MagicMock()
        db.table.return_value = query

        areas = await LocalAreaRepository(db).list_candidates()

        self.assertEqual(len(areas), 201)
        self.assertEqual(db.table.call_count, 2)
        self.assertEqual(
            query.order.call_args_list,
            [call("name"), call("id"), call("name"), call("id")],
        )
        self.assertEqual(query.range.call_args_list, [call(0, 199), call(200, 399)])


class ProvinceRepositoryCollectionTests(IsolatedAsyncioTestCase):
    async def test_province_query_fetches_all_pages(self) -> None:
        query = MagicMock()
        query.select.return_value = query
        query.order.return_value = query
        query.range.return_value = query
        province_row = make_province().model_dump(mode="json")
        query.execute = AsyncMock(
            side_effect=[
                SimpleNamespace(data=[province_row] * 100),
                SimpleNamespace(data=[province_row]),
            ]
        )
        db = MagicMock()
        db.table.return_value = query

        provinces = await ProvinceRepository(db).list_all()

        self.assertEqual(len(provinces), 101)
        self.assertEqual(query.range.call_args_list, [call(0, 99), call(100, 199)])


def make_location_service(
    *, max_match_distance_km: float = 75.0
) -> tuple[LocationService, MagicMock, MagicMock]:
    area_repo = MagicMock(spec=ILocalAreaRepository)
    province_repo = MagicMock(spec=IProvinceRepository)
    area_repo.list_candidates = AsyncMock(return_value=[make_area()])
    area_repo.list_for_province = AsyncMock(return_value=[make_area()])
    province_repo.list_all = AsyncMock(return_value=[make_province()])
    province_repo.get_by_id = AsyncMock(return_value=make_province())
    return (
        LocationService(area_repo, province_repo, max_match_distance_km),
        area_repo,
        province_repo,
    )


class LocationServiceTests(IsolatedAsyncioTestCase):
    async def test_text_resolves_local_area_and_province(self) -> None:
        service, area_repo, _province_repo = make_location_service()

        result = await service.resolve(LocationResolveRequest(text="Vinh, Nghe An"))

        self.assertEqual(result.province.name, "Nghệ An")
        self.assertEqual(result.local_area.name, "Vinh")
        area_repo.list_for_province.assert_awaited_once_with(PROVINCE_ID)

    async def test_single_vinh_resolves_local_area_not_vinh_long_province(self) -> None:
        service, _area_repo, province_repo = make_location_service()
        province_repo.list_all.return_value = [
            make_province("Vĩnh Long", province_id=VINH_LONG_ID),
            make_province(),
        ]

        result = await service.resolve(LocationResolveRequest(text="Vinh"))

        self.assertEqual(result.local_area.name, "Vinh")
        self.assertEqual(result.province.name, "Nghệ An")

    async def test_multi_component_text_requires_province_match(self) -> None:
        service, area_repo, _province_repo = make_location_service()

        with self.assertRaisesRegex(NotFoundError, "Location not found"):
            await service.resolve(
                LocationResolveRequest(text="Vinh, Unknown Province")
            )
        area_repo.list_for_province.assert_not_awaited()

    async def test_province_only_text_returns_nullable_local_area(self) -> None:
        service, _area_repo, _province_repo = make_location_service()

        result = await service.resolve(LocationResolveRequest(text="Nghệ An"))

        self.assertEqual(result.province.name, "Nghệ An")
        self.assertIsNone(result.local_area)

    async def test_gps_resolves_nearest_area(self) -> None:
        service, _area_repo, province_repo = make_location_service()

        result = await service.resolve(
            LocationResolveRequest(latitude=18.6796, longitude=105.6813)
        )

        self.assertEqual(result.local_area.name, "Vinh")
        province_repo.get_by_id.assert_awaited_once_with(PROVINCE_ID)

    async def test_far_gps_location_is_not_found(self) -> None:
        service, _area_repo, _province_repo = make_location_service()

        with self.assertRaisesRegex(NotFoundError, "Location not found"):
            await service.resolve(LocationResolveRequest(latitude=0, longitude=0))

    async def test_gps_maximum_match_distance_is_configurable(self) -> None:
        service, area_repo, _province_repo = make_location_service(
            max_match_distance_km=50.0
        )
        area_repo.list_candidates.return_value = [
            make_area(latitude=1.0, longitude=0.0)
        ]

        with self.assertRaisesRegex(NotFoundError, "Location not found"):
            await service.resolve(LocationResolveRequest(latitude=0, longitude=0))


class FakeLocationService:
    async def resolve(self, request: LocationResolveRequest) -> ResolvedLocation:
        if request.text == "missing":
            raise NotFoundError("Location not found")
        return ResolvedLocation(province=make_province(), local_area=make_area())


class LocationApiTests(TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[get_location_service] = FakeLocationService
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    def test_resolve_text_location(self) -> None:
        response = self.client.post(
            "/api/v1/locations/resolve", json={"text": "Vinh, Nghệ An"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["province"]["id"], str(PROVINCE_ID))
        self.assertEqual(response.json()["local_area"]["name"], "Vinh")

    def test_resolve_gps_location(self) -> None:
        response = self.client.post(
            "/api/v1/locations/resolve",
            json={"latitude": 18.6796, "longitude": 105.6813},
        )

        self.assertEqual(response.status_code, 200)

    def test_mixed_location_modes_are_rejected(self) -> None:
        response = self.client.post(
            "/api/v1/locations/resolve",
            json={"text": "Vinh", "latitude": 18.6796, "longitude": 105.6813},
        )

        self.assertEqual(response.status_code, 422)

    def test_partial_gps_location_is_rejected(self) -> None:
        response = self.client.post(
            "/api/v1/locations/resolve", json={"latitude": 18.6796}
        )

        self.assertEqual(response.status_code, 422)

    def test_unknown_location_returns_404(self) -> None:
        response = self.client.post(
            "/api/v1/locations/resolve", json={"text": "missing"}
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error_code"], "not_found")
