# ==========================================================================
# Purpose: Convert Application Errors Into Safe HTTP Responses
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.exceptions import AppError


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())
