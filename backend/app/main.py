# ==========================================================================
# Purpose: MAIN APP
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.middleware.error_handler import app_error_handler

# ==========================================================================
# PARAMETERS
# ==========================================================================
logger = logging.getLogger(__name__)


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info("Nomue starting!")
    yield
    logger.info("Nomue shutting down!")


def create_app() -> FastAPI:
    setup_logging()

    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_exception_handler(AppError, app_error_handler)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    return app


# ==========================================================================
# MAIN APP INIT
# ==========================================================================
app = create_app()
