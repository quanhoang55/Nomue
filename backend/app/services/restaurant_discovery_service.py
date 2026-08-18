# ==========================================================================
# Purpose: Grounded Restaurant Discovery and Controlled Persistence
# ==========================================================================
import json
import logging

from app.clients.gemini_client import IGeminiClient
from app.core.exceptions import NotFoundError
from app.core.exceptions import ValidationError as DomainValidationError
from app.repositories.local_area_repository import ILocalAreaRepository
from app.repositories.province_repository import IProvinceRepository
from app.repositories.restaurant_dish_repository import IRestaurantDishRepository
from app.schemas.restaurant import (
    DiscoveredRestaurant,
    RestaurantDiscoveryRequest,
    RestaurantDishSaveRequest,
    RestaurantDishSaveResponse,
)
from app.services.dish_service import DishService
from app.services.location_service import LocationService

logger = logging.getLogger(__name__)
MAX_DISCOVERED_RESTAURANTS = 7


class RestaurantDiscoveryService:
    def __init__(
        self,
        *,
        location_service: LocationService,
        dish_service: DishService,
        gemini_client: IGeminiClient,
        restaurant_dish_repo: IRestaurantDishRepository,
        province_repo: IProvinceRepository,
        local_area_repo: ILocalAreaRepository,
    ) -> None:
        self.location_service = location_service
        self.dish_service = dish_service
        self.gemini_client = gemini_client
        self.restaurant_dish_repo = restaurant_dish_repo
        self.province_repo = province_repo
        self.local_area_repo = local_area_repo

    # ======================================================================
    # Function: Discover 5–7 Grounded Restaurants for a Dish and Location
    # ======================================================================
    async def discover(
        self,
        request: RestaurantDiscoveryRequest,
    ) -> list[DiscoveredRestaurant]:
        dish = await self.dish_service.get_by_id(request.dish_id)
        resolved = await self.location_service.resolve(request.location)

        if request.location.latitude is not None:
            latitude = request.location.latitude
            longitude = request.location.longitude
        elif resolved.local_area is not None:
            latitude = resolved.local_area.latitude
            longitude = resolved.local_area.longitude
        else:
            raise DomainValidationError(
                "Restaurant discovery requires location coordinates"
            )

        maps_input = json.dumps(
            {
                "task": (
                    "Find around 5 to 7 current restaurants near the supplied "
                    "coordinates that are relevant to the supplied dish. Include "
                    "Google place IDs, names, addresses, coordinates, ratings, and "
                    "Maps URLs when available. Never return more than 7 places."
                ),
                "dish": dish.model_dump(mode="json"),
                "resolved_location": resolved.model_dump(mode="json"),
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        maps_context = await self.gemini_client.generate_maps_context(
            maps_input,
            latitude=latitude,
            longitude=longitude,
        )

        structured_input = json.dumps(
            {
                "dish": dish.model_dump(mode="json"),
                "resolved_location": resolved.model_dump(mode="json"),
                "maps_context": maps_context.model_dump(
                    mode="json",
                    exclude_none=True,
                ),
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        generated = await self.gemini_client.generate_structured_restaurants(
            structured_input
        )

        grounded_by_id = {
            place.google_place_id: place
            for place in maps_context.places
            if place.google_place_id is not None
        }
        discovered: list[DiscoveredRestaurant] = []
        seen_place_ids: set[str] = set()
        for restaurant in generated.restaurants:
            grounded_place = grounded_by_id.get(restaurant.google_place_id)
            if grounded_place is None:
                logger.info(
                    "Ignoring ungrounded discovered restaurant place_id=%s",
                    restaurant.google_place_id,
                )
                continue
            if restaurant.google_place_id in seen_place_ids:
                continue

            updates: dict[str, object] = {}
            if grounded_place.name is not None:
                updates["name"] = grounded_place.name
            if grounded_place.google_maps_uri is not None:
                updates["google_maps_uri"] = grounded_place.google_maps_uri
            discovered.append(restaurant.model_copy(update=updates))
            seen_place_ids.add(restaurant.google_place_id)
            if len(discovered) == MAX_DISCOVERED_RESTAURANTS:
                break

        return discovered

    # ======================================================================
    # Function: Save Only Missing Restaurant-Dish Relationships
    # ======================================================================
    async def save_relationships(
        self,
        request: RestaurantDishSaveRequest,
    ) -> RestaurantDishSaveResponse:
        await self.dish_service.get_by_id(request.dish_id)
        province = await self.province_repo.get_by_id(request.province_id)
        if province is None:
            raise NotFoundError("Province not found")

        if request.local_area_id is not None:
            local_area = await self.local_area_repo.get_by_id(
                request.local_area_id
            )
            if local_area is None:
                raise NotFoundError("Local area not found")
            if local_area.province_id != request.province_id:
                raise DomainValidationError(
                    "Local area does not belong to the supplied province"
                )

        existing_relationships = (
            await self.restaurant_dish_repo.get_by_dish_id(request.dish_id)
        )
        existing_by_place_id = {
            relationship.google_place_id: relationship
            for relationship in existing_relationships
        }
        for place_id in request.google_place_ids:
            relationship = existing_by_place_id.get(place_id)
            if (
                relationship is not None
                and relationship.province_id != request.province_id
            ):
                raise DomainValidationError(
                    "A restaurant is already associated with this dish in a "
                    "different province"
                )

        missing_place_ids = [
            place_id
            for place_id in request.google_place_ids
            if place_id not in existing_by_place_id
        ]
        created = await self.restaurant_dish_repo.insert_many(
            missing_place_ids,
            dish_id=request.dish_id,
            province_id=request.province_id,
            local_area_id=request.local_area_id,
        )

        return RestaurantDishSaveResponse(
            requested_count=len(request.google_place_ids),
            created_count=len(created),
            existing_count=len(request.google_place_ids) - len(missing_place_ids),
            google_place_ids=request.google_place_ids,
        )
