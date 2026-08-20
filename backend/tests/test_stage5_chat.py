import json
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

from fastapi.testclient import TestClient

from app.api.dependencies import get_chat_service, get_current_user
from app.clients.gemini_client import GeminiClient, IGeminiClient
from app.core.exceptions import ConfigurationError, GeminiError, NotFoundError
from app.main import app
from app.schemas.chat_schema import (
    ChatDishRecommendation,
    ChatGeminiResponse,
    ChatLocationInterpretation,
    ChatRequest,
    ChatResponse,
    GeminiDishRecommendation,
    MapsGroundedPlace,
    MapsGroundingContext,
    MapsGroundingSource,
    NearbyPlaceRecommendation,
)
from app.schemas.dish import DishResponse
from app.schemas.location import (
    LocalAreaResponse,
    LocationResolveRequest,
    ProvinceResponse,
    ResolvedLocation,
)
from app.services.chat_service import MAX_CHAT_CANDIDATE_DISHES, ChatService
from app.services.dish_service import DishService
from app.services.location_service import LocationService

DISH_ID = UUID("11111111-1111-4111-8111-111111111111")
PROVINCE_ID = UUID("33333333-3333-4333-8333-333333333333")
AREA_ID = UUID("44444444-4444-4444-8444-444444444444")


def make_dish(
    dish_id: UUID = DISH_ID,
    name: str = "Phở",
) -> DishResponse:
    return DishResponse(
        id=dish_id,
        name=name,
        description="Noodle soup",
        spice_level=1,
        sweetness_level=2,
        sourness_level=1,
        bitterness_level=0,
        adventurous_level=1,
        typical_price=50_000,
    )


def make_resolved_location() -> ResolvedLocation:
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


def make_gemini_response(
    *,
    dish_id: UUID | None = DISH_ID,
    restaurants: list[NearbyPlaceRecommendation] | None = None,
) -> ChatGeminiResponse:
    recommended_dishes = (
        []
        if dish_id is None
        else [GeminiDishRecommendation(dish_id=dish_id, reason="Local classic")]
    )
    return ChatGeminiResponse(
        summary="Try a local classic",
        paragraph="Phở is a friendly introduction to Vietnamese cuisine.",
        recommended_dishes=recommended_dishes,
        recommended_restaurants=restaurants or [],
    )


def make_maps_context() -> MapsGroundingContext:
    return MapsGroundingContext(
        grounded_text="Phở Test is a nearby Maps-grounded restaurant.",
        places=[
            MapsGroundedPlace(
                name="Phở Test",
                google_place_id="place-id",
                google_maps_uri="https://maps.google.com/?cid=1",
            )
        ],
        sources=[
            MapsGroundingSource(
                title="Phở Test",
                uri="https://maps.google.com/?cid=1",
                google_place_id="place-id",
            )
        ],
        widget_context_tokens=["widget-token"],
        grounding_signatures=["grounding-signature"],
    )


def make_chat_service(
    *,
    gemini_response: ChatGeminiResponse | None = None,
    interpreted_location: LocationResolveRequest | None = None,
) -> tuple[ChatService, MagicMock, MagicMock, MagicMock]:
    location_service = MagicMock(spec=LocationService)
    dish_service = MagicMock(spec=DishService)
    gemini_client = MagicMock(spec=IGeminiClient)
    location_service.resolve = AsyncMock(return_value=make_resolved_location())
    dish_service.get_by_province = AsyncMock(return_value=[make_dish()])
    gemini_client.interpret_chat_location = AsyncMock(
        return_value=ChatLocationInterpretation(location=interpreted_location)
    )
    gemini_client.generate_maps_context = AsyncMock(return_value=make_maps_context())
    gemini_client.generate_structured_chat = AsyncMock(
        return_value=gemini_response or make_gemini_response()
    )
    return (
        ChatService(
            location_service=location_service,
            dish_service=dish_service,
            gemini_client=gemini_client,
        ),
        location_service,
        dish_service,
        gemini_client,
    )


class ChatRequestSchemaTests(TestCase):
    def test_request_accepts_text_location(self) -> None:
        request = ChatRequest.model_validate(
            {"message": "  What should I try?  ", "location": {"text": "Vinh"}}
        )

        self.assertEqual(request.message, "What should I try?")
        self.assertEqual(request.location.text, "Vinh")

    def test_request_accepts_location_source(self) -> None:
        request = ChatRequest.model_validate(
            {
                "message": "What should I try?",
                "location": {"latitude": 18.68, "longitude": 105.68},
                "location_source": "device_gps",
            }
        )

        self.assertEqual(request.location_source, "device_gps")

    def test_device_gps_source_requires_coordinates(self) -> None:
        with self.assertRaises(ValueError):
            ChatRequest.model_validate(
                {
                    "message": "What should I try?",
                    "location": {"text": "Vinh"},
                    "location_source": "device_gps",
                }
            )

    def test_request_rejects_mixed_location_modes(self) -> None:
        with self.assertRaises(ValueError):
            ChatRequest.model_validate(
                {
                    "message": "Food please",
                    "location": {
                        "text": "Vinh",
                        "latitude": 18.68,
                        "longitude": 105.68,
                    },
                }
            )


class GeminiClientTests(IsolatedAsyncioTestCase):
    async def test_location_interpretation_uses_structured_schema(self) -> None:
        interpretation = ChatLocationInterpretation(
            location={"text": "Phú Thọ"}
        )
        interaction = SimpleNamespace(
            status="completed",
            errors=[],
            output_text=interpretation.model_dump_json(),
        )
        sdk = MagicMock()
        sdk.aio.interactions.create = AsyncMock(return_value=interaction)

        with patch("app.clients.gemini_client.genai.Client", return_value=sdk):
            client = GeminiClient(
                api_key="test-key",
                model="gemini-2.5-flash",
                timeout_seconds=10,
            )
            response = await client.interpret_chat_location(
                "I want to eat Phu Tho food"
            )

        self.assertEqual(response.location.text, "Phú Thọ")
        request = sdk.aio.interactions.create.await_args.kwargs
        self.assertNotIn("tools", request)
        self.assertEqual(
            request["response_format"]["schema"],
            ChatLocationInterpretation.model_json_schema(),
        )

    async def test_maps_call_uses_tools_without_structured_output(self) -> None:
        review = SimpleNamespace(
            review_id="review-id",
            title="Helpful review",
            url="https://maps.google.com/review/1",
        )
        place = SimpleNamespace(
            name="Phở Test",
            place_id="place-id",
            url="https://maps.google.com/?cid=1",
            review_snippets=[review],
        )
        maps_result = SimpleNamespace(
            places=[place],
            widget_context_token="widget-token",
        )
        interaction = SimpleNamespace(
            status="completed",
            errors=[],
            output_text="Phở Test is nearby.",
            steps=[
                SimpleNamespace(
                    type="google_maps_result",
                    result=[maps_result],
                    signature="grounding-signature",
                )
            ],
        )
        sdk = MagicMock()
        sdk.aio.interactions.create = AsyncMock(return_value=interaction)

        with patch("app.clients.gemini_client.genai.Client", return_value=sdk):
            client = GeminiClient(
                api_key="test-key",
                model="gemini-2.5-flash",
                timeout_seconds=10,
            )
            response = await client.generate_maps_context(
                "input",
                latitude=18.68,
                longitude=105.68,
            )

        self.assertEqual(response.grounded_text, "Phở Test is nearby.")
        self.assertEqual(response.places[0].google_place_id, "place-id")
        self.assertEqual(response.sources[1].review_id, "review-id")
        self.assertEqual(response.widget_context_tokens, ["widget-token"])
        self.assertEqual(response.grounding_signatures, ["grounding-signature"])
        request = sdk.aio.interactions.create.await_args.kwargs
        self.assertEqual(request["model"], "gemini-2.5-flash")
        self.assertFalse(request["store"])
        self.assertEqual(request["generation_config"]["thinking_level"], "low")
        self.assertEqual(
            request["tools"],
            [
                {
                    "type": "google_maps",
                    "latitude": 18.68,
                    "longitude": 105.68,
                }
            ],
        )
        self.assertNotIn("response_format", request)

    async def test_structured_call_uses_schema_without_maps_tools(self) -> None:
        interaction = SimpleNamespace(
            status="completed",
            errors=[],
            output_text=make_gemini_response().model_dump_json(),
        )
        sdk = MagicMock()
        sdk.aio.interactions.create = AsyncMock(return_value=interaction)

        with patch("app.clients.gemini_client.genai.Client", return_value=sdk):
            client = GeminiClient(
                api_key="test-key",
                model="gemini-2.5-flash",
                timeout_seconds=10,
            )
            response = await client.generate_structured_chat("input")

        self.assertEqual(response.summary, "Try a local classic")
        request = sdk.aio.interactions.create.await_args.kwargs
        self.assertNotIn("tools", request)
        self.assertEqual(request["generation_config"]["thinking_level"], "low")
        self.assertEqual(
            request["response_format"],
            {
                "type": "text",
                "mime_type": "application/json",
                "schema": ChatGeminiResponse.model_json_schema(),
            },
        )

    async def test_invalid_structured_output_is_mapped_to_safe_error(self) -> None:
        sdk = MagicMock()
        sdk.aio.interactions.create = AsyncMock(
            return_value=SimpleNamespace(
                status="completed",
                errors=[],
                output_text='{"summary":"missing required fields"}',
            )
        )

        with patch("app.clients.gemini_client.genai.Client", return_value=sdk):
            client = GeminiClient(
                api_key="test-key",
                model="gemini-2.5-flash",
                timeout_seconds=10,
            )
            with self.assertRaises(GeminiError):
                await client.generate_structured_chat("input")

    async def test_api_failure_is_mapped_to_safe_error(self) -> None:
        sdk = MagicMock()
        sdk.aio.interactions.create = AsyncMock(side_effect=RuntimeError("secret"))

        with patch("app.clients.gemini_client.genai.Client", return_value=sdk):
            client = GeminiClient(
                api_key="test-key",
                model="gemini-2.5-flash",
                timeout_seconds=10,
            )
            with self.assertRaisesRegex(GeminiError, "unavailable"):
                await client.generate_structured_chat("input")

        self.assertEqual(sdk.aio.interactions.create.await_count, 1)

    async def test_unavailable_model_maps_to_configuration_error(self) -> None:
        unavailable_model_error = RuntimeError("provider response must stay private")
        unavailable_model_error.response = SimpleNamespace(status_code=404)
        sdk = MagicMock()
        sdk.aio.interactions.create = AsyncMock(
            side_effect=unavailable_model_error
        )

        with patch("app.clients.gemini_client.genai.Client", return_value=sdk):
            client = GeminiClient(
                api_key="test-key",
                model="retired-model",
                timeout_seconds=10,
            )
            with self.assertRaisesRegex(
                ConfigurationError,
                "model is unavailable",
            ):
                await client.generate_structured_chat("input")

        self.assertEqual(sdk.aio.interactions.create.await_count, 1)

    async def test_maps_call_with_no_useful_result_is_rejected(self) -> None:
        sdk = MagicMock()
        sdk.aio.interactions.create = AsyncMock(
            return_value=SimpleNamespace(
                status="completed",
                errors=[],
                output_text="",
                steps=[],
            )
        )

        with patch("app.clients.gemini_client.genai.Client", return_value=sdk):
            client = GeminiClient(
                api_key="test-key",
                model="gemini-2.5-flash",
                timeout_seconds=10,
            )
            with self.assertRaisesRegex(GeminiError, "no useful data"):
                await client.generate_maps_context(
                    "input",
                    latitude=18.68,
                    longitude=105.68,
                )

    async def test_blank_api_key_is_rejected(self) -> None:
        with self.assertRaises(ConfigurationError):
            GeminiClient(api_key=" ", model="gemini-2.5-flash", timeout_seconds=10)


class ChatServiceTests(IsolatedAsyncioTestCase):
    async def test_gps_uses_exact_coordinates_and_relevant_dishes(self) -> None:
        restaurant = NearbyPlaceRecommendation(
            google_place_id="place-id",
            name="Phở Test",
            address="Vinh",
            latitude=18.68,
            longitude=105.68,
            rating=4.5,
            google_maps_uri="https://maps.google.com/?cid=1",
            related_dish_ids=[DISH_ID],
            reason="Nearby",
        )
        service, _location_service, dish_service, gemini_client = make_chat_service(
            gemini_response=make_gemini_response(restaurants=[restaurant])
        )

        response = await service.chat(
            ChatRequest(
                message="Give me recommended dishes",
                location={"latitude": 18.7, "longitude": 105.7},
                location_source="device_gps",
            )
        )

        dish_service.get_by_province.assert_awaited_once_with(PROVINCE_ID)
        maps_call = gemini_client.generate_maps_context.await_args
        self.assertEqual(maps_call.kwargs["latitude"], 18.7)
        self.assertEqual(maps_call.kwargs["longitude"], 105.7)
        structured_call = gemini_client.generate_structured_chat.await_args
        self.assertEqual(response.location.coordinate_source, "gps")
        self.assertEqual(response.location.selection_source, "device_gps")
        self.assertEqual(response.recommended_dishes[0].dish, make_dish())
        self.assertEqual(response.recommended_restaurants, [restaurant])
        self.assertEqual(
            response.maps_grounding.widget_context_tokens,
            ["widget-token"],
        )

        context_text = structured_call.args[0].split(
            "\n\nUSER_MESSAGE:",
            maxsplit=1,
        )[0]
        context = json.loads(context_text.removeprefix("BACKEND_CONTEXT:\n"))
        self.assertEqual(context["location"]["province"]["name"], "Nghệ An")
        self.assertEqual(context["candidate_dishes"][0]["name"], "Phở")
        self.assertEqual(context["maps_context"]["places"][0]["name"], "Phở Test")
        self.assertEqual(
            context["maps_context"]["widget_context_tokens"],
            ["widget-token"],
        )
        self.assertNotIn("user_preferences", context)

    async def test_message_location_overrides_different_device_gps(self) -> None:
        message_location = LocationResolveRequest(text="Phu Tho")
        service, location_service, _dish_service, _gemini_client = (
            make_chat_service(interpreted_location=message_location)
        )

        response = await service.chat(
            ChatRequest(
                message="I want to eat Phu Tho food",
                location={"latitude": 18.6796, "longitude": 105.6813},
                location_source="device_gps",
            )
        )

        location_service.resolve.assert_awaited_once_with(message_location)
        self.assertEqual(response.location.selection_source, "message")

    async def test_message_vinh_overrides_selected_app_location(self) -> None:
        message_location = LocationResolveRequest(text="Vinh, Nghe An")
        service, location_service, _dish_service, _gemini_client = (
            make_chat_service(interpreted_location=message_location)
        )

        response = await service.chat(
            ChatRequest(
                message="Find eel dishes in Vinh, Nghe An",
                location={"text": "Phú Thọ"},
                location_source="user_selected",
            )
        )

        location_service.resolve.assert_awaited_once_with(message_location)
        self.assertEqual(response.location.selection_source, "message")

    async def test_explicit_manual_text_location_is_used_as_context(self) -> None:
        service, location_service, _dish_service, _gemini_client = (
            make_chat_service()
        )
        manual_location = LocationResolveRequest(text="Phú Thọ")

        response = await service.chat(
            ChatRequest(
                message="Give me recommended dishes",
                location=manual_location,
                location_source="user_selected",
            )
        )

        location_service.resolve.assert_awaited_once_with(manual_location)
        self.assertEqual(response.location.selection_source, "user_selected")

    async def test_explicit_coordinates_only_are_supported(self) -> None:
        service, location_service, _dish_service, _gemini_client = (
            make_chat_service()
        )
        coordinates = LocationResolveRequest(latitude=21.02, longitude=105.84)

        response = await service.chat(
            ChatRequest(
                message="Give me recommended dishes",
                location=coordinates,
                location_source="user_selected",
            )
        )

        location_service.resolve.assert_awaited_once_with(coordinates)
        self.assertEqual(response.location.coordinate_source, "gps")
        self.assertEqual(response.location.selection_source, "user_selected")

    async def test_coordinates_stated_in_message_override_context(self) -> None:
        message_coordinates = LocationResolveRequest(
            latitude=21.02,
            longitude=105.84,
        )
        service, location_service, _dish_service, _gemini_client = (
            make_chat_service(interpreted_location=message_coordinates)
        )

        response = await service.chat(
            ChatRequest(
                message="I am in 21.02, 105.84",
                location={"text": "Vinh"},
                location_source="user_selected",
            )
        )

        location_service.resolve.assert_awaited_once_with(message_coordinates)
        self.assertEqual(response.location.selection_source, "message")
        self.assertEqual(response.location.latitude, 21.02)
        self.assertEqual(response.location.longitude, 105.84)

    async def test_location_interpreter_failure_falls_back_to_context(self) -> None:
        service, location_service, _dish_service, gemini_client = (
            make_chat_service()
        )
        gemini_client.interpret_chat_location.side_effect = GeminiError(
            "Interpreter unavailable"
        )
        fallback = LocationResolveRequest(text="Phú Thọ")

        response = await service.chat(
            ChatRequest(
                message="Give me recommended dishes",
                location=fallback,
                location_source="user_selected",
            )
        )

        location_service.resolve.assert_awaited_once_with(fallback)
        self.assertEqual(response.location.selection_source, "user_selected")

    async def test_no_usable_location_still_returns_chat_response(self) -> None:
        service, location_service, dish_service, gemini_client = make_chat_service(
            gemini_response=make_gemini_response(dish_id=None)
        )

        response = await service.chat(
            ChatRequest(message="Tell me something about Vietnamese food")
        )

        location_service.resolve.assert_not_awaited()
        dish_service.get_by_province.assert_not_awaited()
        gemini_client.generate_structured_chat.assert_awaited_once()
        self.assertIsNone(response.location)
        self.assertEqual(response.recommended_dishes, [])

    async def test_text_location_uses_resolved_area_coordinates(self) -> None:
        service, _location_service, _dish_service, gemini_client = make_chat_service()

        response = await service.chat(
            ChatRequest(message="Where can I eat?", location={"text": "Vinh"})
        )

        call = gemini_client.generate_maps_context.await_args
        self.assertEqual(call.kwargs["latitude"], 18.6796)
        self.assertEqual(call.kwargs["longitude"], 105.6813)
        self.assertEqual(response.location.coordinate_source, "resolved_local_area")

    async def test_irrelevant_request_does_not_enable_maps(self) -> None:
        restaurant = NearbyPlaceRecommendation(
            name="Ungrounded place",
            related_dish_ids=[DISH_ID],
        )
        service, _location_service, _dish_service, gemini_client = make_chat_service(
            gemini_response=make_gemini_response(restaurants=[restaurant])
        )

        response = await service.chat(
            ChatRequest(message="Explain phở history", location={"text": "Vinh"})
        )

        gemini_client.generate_maps_context.assert_not_awaited()
        gemini_client.generate_structured_chat.assert_awaited_once()
        self.assertEqual(response.recommended_restaurants, [])
        self.assertIsNone(response.maps_grounding)

    async def test_unavailable_optional_location_does_not_block_chat(self) -> None:
        service, location_service, dish_service, gemini_client = make_chat_service(
            gemini_response=make_gemini_response(dish_id=None)
        )
        location_service.resolve.side_effect = NotFoundError("Location not found")

        response = await service.chat(
            ChatRequest(message="Tell me about food", location={"text": "Unknown"})
        )

        self.assertIsNone(response.location)
        dish_service.get_by_province.assert_not_awaited()
        gemini_client.generate_maps_context.assert_not_awaited()
        gemini_client.generate_structured_chat.assert_awaited_once()

    async def test_candidate_context_is_capped(self) -> None:
        service, _location_service, dish_service, gemini_client = make_chat_service(
            gemini_response=make_gemini_response(dish_id=None)
        )
        dish_service.get_by_province.return_value = [
            make_dish(
                UUID(f"{index:08x}-1111-4111-8111-111111111111"),
                f"Dish {index}",
            )
            for index in range(MAX_CHAT_CANDIDATE_DISHES + 5)
        ]

        await service.chat(
            ChatRequest(message="Suggest food", location={"text": "Vinh"})
        )

        input_text = gemini_client.generate_structured_chat.await_args.args[0]
        context_text = input_text.split("\n\nUSER_MESSAGE:", maxsplit=1)[0]
        context = json.loads(context_text.removeprefix("BACKEND_CONTEXT:\n"))
        self.assertEqual(
            len(context["candidate_dishes"]),
            MAX_CHAT_CANDIDATE_DISHES,
        )

    async def test_no_matching_dishes_still_returns_food_chat(self) -> None:
        service, _location_service, dish_service, gemini_client = make_chat_service(
            gemini_response=make_gemini_response(dish_id=None)
        )
        dish_service.get_by_province.return_value = []

        response = await service.chat(
            ChatRequest(message="Suggest food", location={"text": "Vinh"})
        )

        self.assertEqual(response.recommended_dishes, [])
        self.assertEqual(response.summary, "Try a local classic")
        gemini_client.generate_structured_chat.assert_awaited_once()

    async def test_maps_failure_falls_back_to_food_only_structured_call(self) -> None:
        restaurant = NearbyPlaceRecommendation(
            name="Ungrounded place",
            related_dish_ids=[DISH_ID],
        )
        service, _location_service, _dish_service, gemini_client = make_chat_service(
            gemini_response=make_gemini_response(restaurants=[restaurant])
        )
        gemini_client.generate_maps_context.side_effect = GeminiError(
            "Maps unavailable"
        )

        response = await service.chat(
            ChatRequest(
                message="Recommend a nearby restaurant",
                location={"text": "Vinh"},
            )
        )

        gemini_client.generate_maps_context.assert_awaited_once()
        gemini_client.generate_structured_chat.assert_awaited_once()
        self.assertEqual(response.recommended_restaurants, [])
        self.assertIsNone(response.maps_grounding)
        final_input = gemini_client.generate_structured_chat.await_args.args[0]
        self.assertNotIn('"maps_context"', final_input)

    async def test_final_restaurant_must_match_maps_grounding(self) -> None:
        restaurant = NearbyPlaceRecommendation(
            google_place_id="invented-place-id",
            name="Invented Restaurant",
            related_dish_ids=[DISH_ID],
        )
        service, _location_service, _dish_service, _gemini_client = make_chat_service(
            gemini_response=make_gemini_response(restaurants=[restaurant])
        )

        with self.assertRaisesRegex(GeminiError, "ungrounded place"):
            await service.chat(
                ChatRequest(
                    message="Recommend a nearby restaurant",
                    location={"text": "Vinh"},
                )
            )

    async def test_unknown_gemini_dish_id_is_rejected(self) -> None:
        unknown_id = UUID("99999999-9999-4999-8999-999999999999")
        service, _location_service, _dish_service, _gemini_client = make_chat_service(
            gemini_response=make_gemini_response(dish_id=unknown_id)
        )

        with self.assertRaisesRegex(GeminiError, "unknown dish"):
            await service.chat(
                ChatRequest(message="Suggest food", location={"text": "Vinh"})
            )


class FakeChatService:
    def __init__(self) -> None:
        self.failure = False

    async def chat(self, _request: ChatRequest) -> ChatResponse:
        if self.failure:
            raise GeminiError("The recommendation service is unavailable")
        dish = make_dish()
        return ChatResponse(
            summary="Try phở",
            paragraph="A classic noodle soup.",
            recommended_dishes=[
                ChatDishRecommendation(dish=dish, reason="Local classic")
            ],
            recommended_restaurants=[],
            location=None,
        )


class ChatApiTests(TestCase):
    def setUp(self) -> None:
        self.service = FakeChatService()
        app.dependency_overrides[get_chat_service] = lambda: self.service
        app.dependency_overrides[get_current_user] = lambda: object()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.client.close()

    def test_chat_endpoint_returns_validated_response(self) -> None:
        response = self.client.post(
            "/api/v1/chat",
            json={"message": "What should I try?", "location": {"text": "Vinh"}},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["summary"], "Try phở")
        self.assertEqual(
            response.json()["recommended_dishes"][0]["dish"]["id"],
            str(DISH_ID),
        )

    def test_chat_endpoint_applies_message_location_override(self) -> None:
        message_location = LocationResolveRequest(text="Phu Tho")
        service, location_service, _dish_service, _gemini_client = (
            make_chat_service(interpreted_location=message_location)
        )
        app.dependency_overrides[get_chat_service] = lambda: service

        response = self.client.post(
            "/api/v1/chat",
            json={
                "message": "I want to eat Phu Tho food",
                "location": {"latitude": 18.6796, "longitude": 105.6813},
                "location_source": "device_gps",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["location"]["selection_source"], "message")
        location_service.resolve.assert_awaited_once_with(message_location)

    def test_chat_endpoint_rejects_blank_message(self) -> None:
        response = self.client.post("/api/v1/chat", json={"message": "  "})

        self.assertEqual(response.status_code, 422)

    def test_chat_endpoint_maps_gemini_failure_to_safe_502(self) -> None:
        self.service.failure = True

        response = self.client.post("/api/v1/chat", json={"message": "Food please"})

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["error_code"], "gemini_error")
