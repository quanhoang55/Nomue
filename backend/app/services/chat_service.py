# ==========================================================================
# Purpose: Gemini Chat and Recommendation Orchestration
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import json
import logging
from typing import Literal
from uuid import UUID

from app.clients.gemini_client import IGeminiClient
from app.core.exceptions import GeminiError, NotFoundError
from app.schemas.chat_schema import (
    ChatBackendContext,
    ChatDishRecommendation,
    ChatLocationContext,
    ChatRequest,
    ChatResponse,
    MapsGroundedPlace,
    MapsGroundingAttribution,
    MapsGroundingContext,
    NearbyPlaceRecommendation,
)
from app.schemas.location import LocationResolveRequest
from app.services.dish_service import DishService
from app.services.location_service import LocationService

# ==========================================================================
# PARAMETERS
# ==========================================================================
logger = logging.getLogger(__name__)
MAX_CHAT_CANDIDATE_DISHES = 20
MAPS_RELEVANCE_TERMS = frozenset(
    {
        "around",
        "close",
        "eat",
        "map",
        "near",
        "nearby",
        "place",
        "recommend",
        "restaurant",
        "suggest",
        "try",
        "where",
        "gần",
        "nhà hàng",
        "quán",
        "ở đâu",
    }
)
ChatLocationSelectionSource = Literal[
    "message",
    "user_selected",
    "device_gps",
    "legacy_request",
]


# ==========================================================================
# Class: ChatService
# ==========================================================================
class ChatService:
    def __init__(
        self,
        *,
        location_service: LocationService,
        dish_service: DishService,
        gemini_client: IGeminiClient,
    ) -> None:
        self.location_service = location_service
        self.dish_service = dish_service
        self.gemini_client = gemini_client

    # ======================================================================
    # Function: Build Context, Call Gemini, and Normalize the Response
    # ======================================================================
    async def chat(self, request: ChatRequest) -> ChatResponse:
        location_request, selection_source = await self._select_location_request(
            request
        )
        location = await self._resolve_location(
            location_request,
            selection_source=selection_source,
        )
        candidate_dishes = []
        if location is not None:
            candidate_dishes = (
                await self.dish_service.get_by_province(location.province.id)
            )[:MAX_CHAT_CANDIDATE_DISHES]

        context = ChatBackendContext(
            location=location,
            candidate_dishes=candidate_dishes,
            user_preferences=None,
        )

        use_maps = self._should_use_maps(request.message, location)
        maps_context = await self._get_maps_context(
            context=context,
            message=request.message,
            location=location,
            use_maps=use_maps,
        )
        final_context = context.model_copy(update={"maps_context": maps_context})
        input_text = self._build_input_text(final_context, request.message)
        gemini_response = await self.gemini_client.generate_structured_chat(
            input_text
        )

        candidate_by_id = {dish.id: dish for dish in candidate_dishes}
        recommended_dishes: list[ChatDishRecommendation] = []
        seen_dish_ids: set[UUID] = set()
        for recommendation in gemini_response.recommended_dishes:
            dish = candidate_by_id.get(recommendation.dish_id)
            if dish is None:
                raise GeminiError(
                    "The recommendation service returned an unknown dish"
                )
            if dish.id in seen_dish_ids:
                continue
            seen_dish_ids.add(dish.id)
            recommended_dishes.append(
                ChatDishRecommendation(dish=dish, reason=recommendation.reason)
            )

        restaurants = (
            self._validate_grounded_restaurants(
                gemini_response.recommended_restaurants,
                set(candidate_by_id),
                maps_context,
            )
            if maps_context is not None
            else []
        )
        maps_grounding = (
            MapsGroundingAttribution(
                sources=maps_context.sources,
                widget_context_tokens=maps_context.widget_context_tokens,
                grounding_signatures=maps_context.grounding_signatures,
            )
            if maps_context is not None
            else None
        )
        return ChatResponse(
            summary=gemini_response.summary,
            paragraph=gemini_response.paragraph,
            recommended_dishes=recommended_dishes,
            recommended_restaurants=restaurants,
            location=location,
            maps_grounding=maps_grounding,
        )

    # ======================================================================
    # Function: Run Optional Maps-Only Grounding Call
    # ======================================================================
    async def _get_maps_context(
        self,
        *,
        context: ChatBackendContext,
        message: str,
        location: ChatLocationContext | None,
        use_maps: bool,
    ) -> MapsGroundingContext | None:
        if (
            not use_maps
            or location is None
            or location.latitude is None
            or location.longitude is None
        ):
            return None

        maps_input_text = self._build_input_text(context, message)
        try:
            return await self.gemini_client.generate_maps_context(
                maps_input_text,
                latitude=location.latitude,
                longitude=location.longitude,
            )
        except GeminiError:
            logger.info("Maps grounding failed; continuing with food-only chat")
            return None

    # ======================================================================
    # Function: Select Message Location Before Supplied App Context
    # ======================================================================
    async def _select_location_request(
        self,
        request: ChatRequest,
    ) -> tuple[LocationResolveRequest | None, ChatLocationSelectionSource | None]:
        try:
            interpretation = await self.gemini_client.interpret_chat_location(
                request.message
            )
        except GeminiError:
            logger.info(
                "Chat location interpretation failed; using supplied context"
            )
        else:
            if interpretation.location is not None:
                logger.info("Chat location selected from message")
                return interpretation.location, "message"

        if request.location is None:
            logger.info("Chat request has no usable location context")
            return None, None

        selection_source: ChatLocationSelectionSource = (
            request.location_source or "legacy_request"
        )
        logger.info("Chat location selected from %s", selection_source)
        return request.location, selection_source

    # ======================================================================
    # Function: Resolve Optional Chat Location Without Blocking General Chat
    # ======================================================================
    async def _resolve_location(
        self,
        location_request: LocationResolveRequest | None,
        *,
        selection_source: ChatLocationSelectionSource | None,
    ) -> ChatLocationContext | None:
        if location_request is None or selection_source is None:
            return None

        try:
            resolved = await self.location_service.resolve(location_request)
        except NotFoundError:
            logger.info("Optional chat location could not be resolved")
            return None

        if location_request.latitude is not None:
            latitude = location_request.latitude
            longitude = location_request.longitude
            coordinate_source = "gps"
        elif resolved.local_area is not None:
            latitude = resolved.local_area.latitude
            longitude = resolved.local_area.longitude
            coordinate_source = "resolved_local_area"
        else:
            latitude = None
            longitude = None
            coordinate_source = None

        return ChatLocationContext(
            province=resolved.province,
            local_area=resolved.local_area,
            latitude=latitude,
            longitude=longitude,
            coordinate_source=coordinate_source,
            selection_source=selection_source,
        )

    # ======================================================================
    # Function: Construct Compact Dynamic Gemini Input
    # ======================================================================
    @staticmethod
    def _build_input_text(context: ChatBackendContext, message: str) -> str:
        context_json = json.dumps(
            context.model_dump(mode="json", exclude_none=True),
            ensure_ascii=False,
            separators=(",", ":"),
        )
        user_message = json.dumps(message, ensure_ascii=False)
        return f"BACKEND_CONTEXT:\n{context_json}\n\nUSER_MESSAGE:\n{user_message}"

    # ======================================================================
    # Function: Decide Whether Current Place Data Is Relevant
    # ======================================================================
    @staticmethod
    def _should_use_maps(
        message: str,
        location: ChatLocationContext | None,
    ) -> bool:
        if location is None or location.latitude is None:
            return False
        normalized_message = message.casefold()
        return any(term in normalized_message for term in MAPS_RELEVANCE_TERMS)

    # ======================================================================
    # Function: Validate Restaurants Against Maps and Database Context
    # ======================================================================
    @staticmethod
    def _validate_grounded_restaurants(
        restaurants: list[NearbyPlaceRecommendation],
        candidate_ids: set[UUID],
        maps_context: MapsGroundingContext,
    ) -> list[NearbyPlaceRecommendation]:
        validated: list[NearbyPlaceRecommendation] = []
        seen_places: set[str] = set()
        for restaurant in restaurants:
            if any(
                dish_id not in candidate_ids
                for dish_id in restaurant.related_dish_ids
            ):
                raise GeminiError(
                    "The recommendation service returned an unknown dish"
                )

            grounded_place = ChatService._find_grounded_place(
                restaurant,
                maps_context.places,
            )
            if grounded_place is None:
                raise GeminiError(
                    "The recommendation service returned an ungrounded place"
                )

            updates: dict[str, object] = {}
            if grounded_place.name is not None:
                updates["name"] = grounded_place.name
            if grounded_place.google_place_id is not None:
                updates["google_place_id"] = grounded_place.google_place_id
            if grounded_place.google_maps_uri is not None:
                updates["google_maps_uri"] = grounded_place.google_maps_uri
            normalized = restaurant.model_copy(update=updates)

            place_key = normalized.google_place_id or normalized.name.casefold()
            if place_key in seen_places:
                continue
            seen_places.add(place_key)
            validated.append(normalized)
        return validated

    # ======================================================================
    # Function: Match a Final Restaurant to Maps Grounding
    # ======================================================================
    @staticmethod
    def _find_grounded_place(
        restaurant: NearbyPlaceRecommendation,
        places: list[MapsGroundedPlace],
    ) -> MapsGroundedPlace | None:
        for place in places:
            if (
                restaurant.google_place_id is not None
                and place.google_place_id == restaurant.google_place_id
            ):
                return place
            if (
                place.name is not None
                and place.name.strip().casefold() == restaurant.name.strip().casefold()
            ):
                return place
        return None
