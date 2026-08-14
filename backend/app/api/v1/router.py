# ==========================================================================
# Purpose: Main Router
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from fastapi import APIRouter

# router connection
from app.api.v1.endpoints.dish import router as dish_router

# ==========================================================================
# Router Connect
# ==========================================================================
api_router = APIRouter()
# api_router.include_router(health_router, tags=["Health"])

# Later
api_router.include_router(dish_router, tags=["Dish"])
# api_router.include_router(locations_router)
# api_router.include_router(restaurants_router)
# api_router.include_router(chat_router)
# api_router.include_router(users_router)
