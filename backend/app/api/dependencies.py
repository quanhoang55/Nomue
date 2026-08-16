# ==========================================================================
# Purpose:Return Services
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from app.clients.supabase_client import get_supabase
from app.core.config import settings
from app.repositories.dish_province_repository import DishProvinceRepository
from app.repositories.dish_repository import DishRepository
from app.repositories.local_area_repository import LocalAreaRepository
from app.repositories.province_repository import ProvinceRepository
from app.services.dish_service import DishService
from app.services.location_service import LocationService

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
