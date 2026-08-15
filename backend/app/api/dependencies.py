# ==========================================================================
# Purpose:Return Services
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from app.clients.supabase_client import get_supabase
from app.repositories.dish_repository import DishRepository
from app.services.dish_service import DishService

# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================


async def get_dish_service() -> DishService:
    db = await get_supabase()
    repo = DishRepository(db)
    return DishService(repo)
