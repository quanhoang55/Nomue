# ==========================================================================
# Purpose: Gemini Chat Endpoint
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_chat_service
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.services.chat_service import ChatService

# ==========================================================================
# PARAMETERS
# ==========================================================================
router = APIRouter(prefix="/chat", tags=["Chat"])
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]


# ==========================================================================
# Function: Create a Food Recommendation Chat Response
# ==========================================================================
@router.post("", response_model=ChatResponse)
async def create_chat_response(
    request: ChatRequest,
    service: ChatServiceDep,
) -> ChatResponse:
    return await service.chat(request)
