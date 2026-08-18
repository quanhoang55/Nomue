# ==========================================================================
# Purpose: Gemini Chat Endpoint
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_chat_service, get_restaurant_discovery_service
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.schemas.restaurant import DiscoveredRestaurant, RestaurantDiscoveryRequest
from app.services.chat_service import ChatService
from app.services.restaurant_discovery_service import RestaurantDiscoveryService

# ==========================================================================
# PARAMETERS
# ==========================================================================
router = APIRouter(prefix="/chat", tags=["Chat"])
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
RestaurantDiscoveryServiceDep = Annotated[
    RestaurantDiscoveryService,
    Depends(get_restaurant_discovery_service),
]


# ==========================================================================
# Function: Create a Food Recommendation Chat Response
# ==========================================================================
@router.post("", response_model=ChatResponse)
async def create_chat_response(
    request: ChatRequest,
    service: ChatServiceDep,
) -> ChatResponse:
    return await service.chat(request)


# ==========================================================================
# Function: Discover Grounded Restaurants for a Dish and Current Location
# ==========================================================================
@router.post(
    "/restaurants/discover",
    response_model=list[DiscoveredRestaurant],
)
async def discover_restaurants(
    request: RestaurantDiscoveryRequest,
    service: RestaurantDiscoveryServiceDep,
) -> list[DiscoveredRestaurant]:
    return await service.discover(request)
