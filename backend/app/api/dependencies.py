# ==========================================================================
# Purpose: Service Dependencies
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from hmac import compare_digest
from typing import Annotated

from fastapi import Header

from app.clients.gemini_client import get_gemini_client
from app.clients.supabase_client import get_supabase
from app.core.config import settings
from app.core.exceptions import AuthenticationError, ConfigurationError
from app.repositories.dish_province_repository import DishProvinceRepository
from app.repositories.dish_repository import DishRepository
from app.repositories.local_area_repository import LocalAreaRepository
from app.repositories.province_repository import ProvinceRepository
from app.repositories.restaurant_dish_repository import RestaurantDishRepository
from app.services.chat_service import ChatService
from app.services.dish_service import DishService
from app.services.location_service import LocationService
from app.services.restaurant_service import RestaurantService
from app.services.restaurant_discovery_service import RestaurantDiscoveryService

# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================


async def get_dish_service() -> DishService:
    db = await get_supabase()
    return DishService(
        dish_repo=DishRepository(db),
        province_repo=ProvinceRepository(db),
        dish_province_repo=DishProvinceRepository(db),
    )


async def get_location_service() -> LocationService:
    db = await get_supabase()
    return LocationService(
        local_area_repo=LocalAreaRepository(db),
        province_repo=ProvinceRepository(db),
        max_match_distance_km=settings.location_max_match_distance_km,
    )


# ==========================================================================
# Function: Build RestaurantService with Database Repositories
# ==========================================================================
async def get_restaurant_service() -> RestaurantService:
    db = await get_supabase()
    return RestaurantService(
        restaurant_dish_repo=RestaurantDishRepository(db),
        dish_repo=DishRepository(db),
        province_repo=ProvinceRepository(db),
    )


# ==========================================================================
# Function: Build Grounded Restaurant Discovery and Persistence Service
# ==========================================================================
async def get_restaurant_discovery_service() -> RestaurantDiscoveryService:
    db = await get_supabase()
    local_area_repo = LocalAreaRepository(db)
    province_repo = ProvinceRepository(db)
    return RestaurantDiscoveryService(
        location_service=LocationService(
            local_area_repo=local_area_repo,
            province_repo=province_repo,
            max_match_distance_km=settings.location_max_match_distance_km,
        ),
        dish_service=DishService(
            dish_repo=DishRepository(db),
            province_repo=province_repo,
            dish_province_repo=DishProvinceRepository(db),
        ),
        gemini_client=get_gemini_client(),
        restaurant_dish_repo=RestaurantDishRepository(db),
        province_repo=province_repo,
        local_area_repo=local_area_repo,
    )


# ==========================================================================
# Function: Protect Internal System Endpoints
# ==========================================================================
def require_system_api_key(
    x_system_key: Annotated[
        str | None,
        Header(alias="X-System-Key"),
    ] = None,
) -> None:
    if settings.system_api_key is None:
        raise ConfigurationError("System API key is not configured")

    configured_key = settings.system_api_key.get_secret_value()
    if x_system_key is None or not compare_digest(x_system_key, configured_key):
        raise AuthenticationError("Invalid system API key")


# ==========================================================================
# Function: Build ChatService from Existing Application Services
# ==========================================================================
async def get_chat_service() -> ChatService:
    return ChatService(
        location_service=await get_location_service(),
        dish_service=await get_dish_service(),
        gemini_client=get_gemini_client(),
    )
