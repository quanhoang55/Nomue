import json
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

from fastapi.testclient import TestClient
from pydantic import SecretStr, ValidationError

from app.api.dependencies import (
    get_current_user,
    get_restaurant_discovery_service,
    require_system_api_key,
)
from app.clients.gemini_client import GeminiClient, IGeminiClient
from app.core.exceptions import AuthenticationError
from app.core.exceptions import ValidationError as DomainValidationError
from app.main import app
from app.repositories.local_area_repository import ILocalAreaRepository
from app.repositories.province_repository import IProvinceRepository
from app.repositories.restaurant_dish_repository import (
    IRestaurantDishRepository,
    RestaurantDishRepository,
)
from app.schemas.chat_schema import MapsGroundedPlace, MapsGroundingContext
from app.schemas.dish import DishResponse
from app.schemas.location import LocalAreaResponse, ProvinceResponse, ResolvedLocation
from app.schemas.restaurant import (
    DiscoveredRestaurant,
    GeminiRestaurantDiscovery,
    RestaurantDiscoveryRequest,
    RestaurantDishResponse,
    RestaurantDishSaveRequest,
    RestaurantDishSaveResponse,
)
from app.services.dish_service import DishService
from app.services.location_service import LocationService
from app.services.restaurant_discovery_service import RestaurantDiscoveryService

DISH_ID = UUID("11111111-1111-4111-8111-111111111111")
PROVINCE_ID = UUID("33333333-3333-4333-8333-333333333333")
OTHER_PROVINCE_ID = UUID("99999999-9999-4999-8999-999999999999")
AREA_ID = UUID("44444444-4444-4444-8444-444444444444")
RELATIONSHIP_ID = UUID("66666666-6666-4666-8666-666666666666")


def make_dish() -> DishResponse:
    return DishResponse(
        id=DISH_ID,
        name="Súp Lươn Nghệ An",
        description="Spicy eel soup",
        spice_level=3,
        sweetness_level=1,
        sourness_level=1,
        bitterness_level=0,
        adventurous_level=2,
        typical_price=45_000,
    )


def make_location() -> ResolvedLocation:
    return ResolvedLocation(
        province=ProvinceResponse(id=PROVINCE_ID, name="Nghệ An"),
        local_area=LocalAreaResponse(
            id=AREA_ID,
            province_id=PROVINCE_ID,
            name="Vinh",
            area_type="Thành phố",
            latitude=18.6796,
            longitude=105.6813,
        ),
    )


def make_discovered(place_id: str = "place-1") -> DiscoveredRestaurant:
    return DiscoveredRestaurant(
        google_place_id=place_id,
        name=f"Restaurant {place_id}",
        address="Vinh, Nghệ An",
        latitude=18.68,
        longitude=105.68,
        rating=4.5,
        google_maps_uri=f"https://maps.google.com/?q={place_id}",
        reason="Known for eel dishes",
    )


def make_relationship(
    place_id: str,
    *,
    province_id: UUID = PROVINCE_ID,
) -> RestaurantDishResponse:
    return RestaurantDishResponse(
        id=RELATIONSHIP_ID,
        google_place_id=place_id,
        dish_id=DISH_ID,
        province_id=province_id,
        local_area_id=AREA_ID,
        last_verified_at=None,
    )


def make_maps_context() -> MapsGroundingContext:
    return MapsGroundingContext(
        grounded_text="Restaurant place-1 and place-2 are nearby.",
        places=[
            MapsGroundedPlace(
                name="Grounded Restaurant 1",
                google_place_id="place-1",
                google_maps_uri="https://maps.google.com/?q=place-1",
            ),
            MapsGroundedPlace(
                name="Grounded Restaurant 2",
                google_place_id="place-2",
                google_maps_uri="https://maps.google.com/?q=place-2",
            ),
        ],
        sources=[],
        widget_context_tokens=[],
        grounding_signatures=[],
    )


def make_service() -> tuple[
    RestaurantDiscoveryService,
    MagicMock,
    MagicMock,
    MagicMock,
    MagicMock,
    MagicMock,
    MagicMock,
]:
    location_service = MagicMock(spec=LocationService)
    dish_service = MagicMock(spec=DishService)
    gemini_client = MagicMock(spec=IGeminiClient)
    relationship_repo = MagicMock(spec=IRestaurantDishRepository)
    province_repo = MagicMock(spec=IProvinceRepository)
    local_area_repo = MagicMock(spec=ILocalAreaRepository)

    location_service.resolve = AsyncMock(return_value=make_location())
    dish_service.get_by_id = AsyncMock(return_value=make_dish())
    gemini_client.generate_maps_context = AsyncMock(
        return_value=make_maps_context()
    )
    gemini_client.generate_structured_restaurants = AsyncMock(
        return_value=GeminiRestaurantDiscovery(
            restaurants=[make_discovered("place-1")]
        )
    )
    relationship_repo.get_by_dish_id = AsyncMock(return_value=[])
    relationship_repo.insert_many = AsyncMock(return_value=[])
    province_repo.get_by_id = AsyncMock(
        return_value=ProvinceResponse(id=PROVINCE_ID, name="Nghệ An")
    )
    local_area_repo.get_by_id = AsyncMock(
        return_value=make_location().local_area
    )

    service = RestaurantDiscoveryService(
        location_service=location_service,
        dish_service=dish_service,
        gemini_client=gemini_client,
        restaurant_dish_repo=relationship_repo,
        province_repo=province_repo,
        local_area_repo=local_area_repo,
    )
    return (
        service,
        location_service,
        dish_service,
        gemini_client,
        relationship_repo,
        province_repo,
        local_area_repo,
    )


class RestaurantDiscoverySchemaTests(TestCase):
    def test_discovery_accepts_text_or_coordinates(self) -> None:
        text_request = RestaurantDiscoveryRequest(
            dish_id=DISH_ID,
            location={"text": "Vinh, Nghệ An"},
        )
        gps_request = RestaurantDiscoveryRequest(
            dish_id=DISH_ID,
            location={"latitude": 18.68, "longitude": 105.68},
        )

        self.assertEqual(text_request.location.text, "Vinh, Nghệ An")
        self.assertEqual(gps_request.location.latitude, 18.68)

    def test_discovery_output_rejects_more_than_seven_results(self) -> None:
        with self.assertRaises(ValidationError):
            GeminiRestaurantDiscovery(
                restaurants=[make_discovered(f"place-{index}") for index in range(8)]
            )

    def test_save_request_deduplicates_place_ids(self) -> None:
        request = RestaurantDishSaveRequest(
            dish_id=DISH_ID,
            province_id=PROVINCE_ID,
            local_area_id=AREA_ID,
            google_place_ids=[" place-1 ", "place-1", "place-2"],
        )

        self.assertEqual(request.google_place_ids, ["place-1", "place-2"])


class GeminiRestaurantDiscoveryTests(IsolatedAsyncioTestCase):
    async def test_restaurant_discovery_uses_strict_json_schema(self) -> None:
        generated = GeminiRestaurantDiscovery(
            restaurants=[make_discovered("place-1")]
        )
        sdk = MagicMock()
        sdk.aio.interactions.create = AsyncMock(
            return_value=SimpleNamespace(
                status="completed",
                errors=[],
                output_text=generated.model_dump_json(),
            )
        )

        with patch("app.clients.gemini_client.genai.Client", return_value=sdk):
            client = GeminiClient(
                api_key="test-key",
                model="gemini-2.5-flash",
                timeout_seconds=10,
            )
            response = await client.generate_structured_restaurants("input")

        self.assertEqual(response.restaurants[0].google_place_id, "place-1")
        request = sdk.aio.interactions.create.await_args.kwargs
        self.assertNotIn("tools", request)
        self.assertEqual(
            request["response_format"]["schema"],
            GeminiRestaurantDiscovery.model_json_schema(),
        )


class RestaurantDiscoveryServiceTests(IsolatedAsyncioTestCase):
    async def test_text_location_uses_resolved_coordinates_and_filters_results(
        self,
    ) -> None:
        service, _location, _dish, gemini, _repo, _province, _area = make_service()
        gemini.generate_structured_restaurants.return_value = (
            GeminiRestaurantDiscovery(
                restaurants=[
                    make_discovered("place-1"),
                    make_discovered("ungrounded-place"),
                ]
            )
        )

        result = await service.discover(
            RestaurantDiscoveryRequest(
                dish_id=DISH_ID,
                location={"text": "Vinh, Nghệ An"},
            )
        )

        self.assertEqual([item.google_place_id for item in result], ["place-1"])
        self.assertEqual(result[0].name, "Grounded Restaurant 1")
        maps_call = gemini.generate_maps_context.await_args
        self.assertEqual(maps_call.kwargs["latitude"], 18.6796)
        self.assertEqual(maps_call.kwargs["longitude"], 105.6813)
        structured_input = json.loads(
            gemini.generate_structured_restaurants.await_args.args[0]
        )
        self.assertEqual(
            structured_input["maps_context"]["places"][0]["google_place_id"],
            "place-1",
        )

    async def test_gps_location_uses_exact_coordinates(self) -> None:
        service, _location, _dish, gemini, _repo, _province, _area = make_service()

        await service.discover(
            RestaurantDiscoveryRequest(
                dish_id=DISH_ID,
                location={"latitude": 21.02, "longitude": 105.84},
            )
        )

        maps_call = gemini.generate_maps_context.await_args
        self.assertEqual(maps_call.kwargs["latitude"], 21.02)
        self.assertEqual(maps_call.kwargs["longitude"], 105.84)

    async def test_empty_grounded_result_is_valid(self) -> None:
        service, _location, _dish, gemini, _repo, _province, _area = make_service()
        gemini.generate_structured_restaurants.return_value = (
            GeminiRestaurantDiscovery(restaurants=[])
        )

        result = await service.discover(
            RestaurantDiscoveryRequest(
                dish_id=DISH_ID,
                location={"text": "Vinh"},
            )
        )

        self.assertEqual(result, [])

    async def test_text_location_without_coordinates_is_rejected(self) -> None:
        service, location, _dish, _gemini, _repo, _province, _area = make_service()
        location.resolve.return_value = ResolvedLocation(
            province=ProvinceResponse(id=PROVINCE_ID, name="Nghệ An"),
            local_area=None,
        )

        with self.assertRaisesRegex(
            DomainValidationError,
            "requires location coordinates",
        ):
            await service.discover(
                RestaurantDiscoveryRequest(
                    dish_id=DISH_ID,
                    location={"text": "Nghệ An"},
                )
            )

    async def test_save_inserts_only_missing_relationships(self) -> None:
        service, _location, _dish, _gemini, repo, _province, _area = make_service()
        repo.get_by_dish_id.return_value = [make_relationship("place-1")]
        repo.insert_many.return_value = [make_relationship("place-2")]
        request = RestaurantDishSaveRequest(
            dish_id=DISH_ID,
            province_id=PROVINCE_ID,
            local_area_id=AREA_ID,
            google_place_ids=["place-1", "place-2"],
        )

        response = await service.save_relationships(request)

        repo.insert_many.assert_awaited_once_with(
            ["place-2"],
            dish_id=DISH_ID,
            province_id=PROVINCE_ID,
            local_area_id=AREA_ID,
        )
        self.assertEqual(response.requested_count, 2)
        self.assertEqual(response.created_count, 1)
        self.assertEqual(response.existing_count, 1)

    async def test_save_rejects_local_area_from_another_province(self) -> None:
        service, _location, _dish, _gemini, repo, _province, area = make_service()
        area.get_by_id.return_value = make_location().local_area.model_copy(
            update={"province_id": OTHER_PROVINCE_ID}
        )

        with self.assertRaisesRegex(DomainValidationError, "does not belong"):
            await service.save_relationships(
                RestaurantDishSaveRequest(
                    dish_id=DISH_ID,
                    province_id=PROVINCE_ID,
                    local_area_id=AREA_ID,
                    google_place_ids=["place-1"],
                )
            )
        repo.insert_many.assert_not_awaited()


class RestaurantDishInsertRepositoryTests(IsolatedAsyncioTestCase):
    async def test_insert_many_writes_only_relationship_identifiers(self) -> None:
        inserted = make_relationship("place-1").model_dump(mode="json")
        query = MagicMock()
        query.insert.return_value = query
        query.execute = AsyncMock(return_value=SimpleNamespace(data=[inserted]))
        db = MagicMock()
        db.table.return_value = query

        result = await RestaurantDishRepository(db).insert_many(
            ["place-1", "place-1"],
            dish_id=DISH_ID,
            province_id=PROVINCE_ID,
            local_area_id=AREA_ID,
        )

        self.assertEqual(result[0].google_place_id, "place-1")
        query.insert.assert_called_once_with(
            [
                {
                    "google_place_id": "place-1",
                    "dish_id": str(DISH_ID),
                    "province_id": str(PROVINCE_ID),
                    "local_area_id": str(AREA_ID),
                }
            ]
        )


class FakeRestaurantDiscoveryService:
    async def discover(
        self,
        _request: RestaurantDiscoveryRequest,
    ) -> list[DiscoveredRestaurant]:
        return [make_discovered("place-1")]

    async def save_relationships(
        self,
        request: RestaurantDishSaveRequest,
    ) -> RestaurantDishSaveResponse:
        return RestaurantDishSaveResponse(
            requested_count=len(request.google_place_ids),
            created_count=len(request.google_place_ids),
            existing_count=0,
            google_place_ids=request.google_place_ids,
        )


class RestaurantDiscoveryApiTests(TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[get_restaurant_discovery_service] = (
            FakeRestaurantDiscoveryService
        )
        app.dependency_overrides[get_current_user] = lambda: object()
        app.dependency_overrides[require_system_api_key] = lambda: None
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    def test_discovery_endpoint_returns_restaurant_list(self) -> None:
        response = self.client.post(
            "/api/v1/chat/restaurants/discover",
            json={
                "dish_id": str(DISH_ID),
                "location": {"text": "Vinh, Nghệ An"},
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["google_place_id"], "place-1")
        self.assertEqual(response.json()[0]["latitude"], 18.68)

    def test_system_endpoint_saves_place_ids(self) -> None:
        response = self.client.post(
            "/api/v1/system/restaurant-dishes",
            json={
                "dish_id": str(DISH_ID),
                "province_id": str(PROVINCE_ID),
                "local_area_id": str(AREA_ID),
                "google_place_ids": ["place-1", "place-2"],
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["created_count"], 2)


class SystemApiKeyTests(TestCase):
    def test_invalid_system_key_is_rejected(self) -> None:
        fake_settings = SimpleNamespace(system_api_key=SecretStr("secret-key"))

        with patch("app.api.dependencies.settings", fake_settings):
            with self.assertRaises(AuthenticationError):
                require_system_api_key("wrong-key")
