# ==========================================================================
# Purpose: Service Dependencies
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from app.clients.gemini_client import get_gemini_client
from app.clients.supabase_client import get_supabase
from app.core.config import settings
from app.repositories.dish_province_repository import DishProvinceRepository
from app.repositories.dish_repository import DishRepository
from app.repositories.local_area_repository import LocalAreaRepository
from app.repositories.province_repository import ProvinceRepository
from app.repositories.restaurant_dish_repository import RestaurantDishRepository
from app.services.chat_service import ChatService
from app.services.dish_service import DishService
from app.services.location_service import LocationService
from app.services.restaurant_service import RestaurantService

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
# Function: Build ChatService from Existing Application Services
# ==========================================================================
async def get_chat_service() -> ChatService:
    return ChatService(
        location_service=await get_location_service(),
        dish_service=await get_dish_service(),
        gemini_client=get_gemini_client(),
    )
