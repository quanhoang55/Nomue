# ==========================================================================
# Purpose: Main Router
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from fastapi import APIRouter

# router connection
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.chat import router as chat_router
from app.api.v1.endpoints.dish import router as dish_router
from app.api.v1.endpoints.dish_type import router as dish_type_router
from app.api.v1.endpoints.location import router as location_router
from app.api.v1.endpoints.preference import router as preference_router
from app.api.v1.endpoints.restaurant import router as restaurant_router
from app.api.v1.endpoints.system import router as system_router

# ==========================================================================
# Router Connect
# ==========================================================================
api_router = APIRouter()
# api_router.include_router(health_router, tags=["Health"])

# Later
api_router.include_router(auth_router)
api_router.include_router(dish_router)
api_router.include_router(dish_type_router)
api_router.include_router(location_router)
api_router.include_router(preference_router)
api_router.include_router(restaurant_router)
api_router.include_router(chat_router)
api_router.include_router(system_router)
# api_router.include_router(users_router)
