# ==========================================================================
# Purpose:Return Services
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from app.clients.supabase_client import get_supabase
from app.repositories.dish_province_repository import DishProvinceRepository
from app.repositories.dish_repository import DishRepository
from app.repositories.province_repository import ProvinceRepository
from app.services.dish_service import DishService

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
