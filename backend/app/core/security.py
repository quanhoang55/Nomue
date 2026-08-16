# ==========================================================================
# Purpose: Authentication Token Verification
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import logging
import time
from typing import TYPE_CHECKING, Any, Never
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic import ValidationError as PydanticError
from supabase_auth.errors import AuthError, AuthRetryableError

from app.core.config import settings
from app.core.constants import (
    BEARER_SCHEME,
    MAX_ACCESS_TOKEN_LENGTH,
    SUPABASE_AUTHENTICATED_ROLE,
    SUPABASE_JWT_ALLOWED_ALGORITHMS,
    SUPABASE_JWT_REQUIRED_CLAIMS,
)
from app.core.exceptions import AuthenticationError, ExternalServiceError

if TYPE_CHECKING:
    from supabase import AsyncClient


# ==========================================================================
# LOG
# ==========================================================================
logger = logging.getLogger(__name__)


# ==========================================================================
# CLASSES / DATA STRUCTURE: Authenticated User
# ==========================================================================
class AuthenticatedUser(BaseModel):
    sub: UUID
    aud: str | list[str]
    exp: int = Field(gt=0)
    iss: str
    role: str
    aal: str | None = None
    iat: int = Field(gt=0)
    nbf: int | None = Field(default=None, gt=0)
    email: str | None = None
    phone: str | None = None
    session_id: UUID
    is_anonymous: bool = False
    app_metadata: dict[str, Any] = Field(default_factory=dict)
    user_metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(extra="ignore", frozen=True)

    @property
    def id(self) -> UUID:
        return self.sub


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================
def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise AuthenticationError()

    scheme, separator, token = authorization.strip().partition(" ")
    if not separator or scheme.casefold() != BEARER_SCHEME.casefold():
        raise AuthenticationError("Invalid authorization scheme")
    return _validate_token_shape(token.strip())


def _validate_token_shape(access_token: str) -> str:
    if not access_token or len(access_token) > MAX_ACCESS_TOKEN_LENGTH:
        raise AuthenticationError("Invalid access token")
    if any(character.isspace() for character in access_token):
        raise AuthenticationError("Invalid access token")
    if access_token.count(".") != 2:
        raise AuthenticationError("Invalid access token")
    return access_token


def _reject_token(reason: str) -> Never:
    logger.info("Access credential rejected (%s)", reason)
    raise AuthenticationError("Invalid or expired access token")


def _validate_claims(
    claims: dict[str, Any], algorithm: str | None
) -> AuthenticatedUser:
    missing_claims = SUPABASE_JWT_REQUIRED_CLAIMS.difference(claims)
    if missing_claims:
        _reject_token("missing required claims")
    if algorithm not in SUPABASE_JWT_ALLOWED_ALGORITHMS:
        _reject_token("unsupported signing algorithm")

    try:
        user = AuthenticatedUser.model_validate(claims)
    except PydanticError:
        _reject_token("invalid claim types")

    if user.iss != settings.supabase_jwt_issuer:
        _reject_token("issuer mismatch")

    audiences = [user.aud] if isinstance(user.aud, str) else user.aud
    if settings.jwt_audience not in audiences:
        _reject_token("audience mismatch")

    if user.role != SUPABASE_AUTHENTICATED_ROLE:
        _reject_token("role is not permitted")

    current_time = int(time.time())
    leeway = settings.jwt_clock_skew_seconds
    if current_time >= user.exp + leeway:
        _reject_token("token expired")
    if user.nbf is not None and current_time + leeway < user.nbf:
        _reject_token("not-before claim is in the future")
    if current_time + leeway < user.iat:
        _reject_token("issued-at claim is in the future")

    return user


async def verify_access_token(
    access_token: str,
    client: "AsyncClient | None" = None,
) -> AuthenticatedUser:
    token = _validate_token_shape(access_token)

    if client is None:
        from app.clients.supabase_client import get_supabase

        client = await get_supabase()

    try:
        response = await client.auth.get_claims(token)
    except AuthRetryableError as exc:
        logger.error("Supabase Auth is temporarily unavailable: %s", type(exc).__name__)
        raise ExternalServiceError(
            "Authentication service is temporarily unavailable",
            service="supabase_auth",
            status_code=503,
        ) from None
    except AuthError as exc:
        logger.info("Supabase rejected a credential (%s)", type(exc).__name__)
        raise AuthenticationError("Invalid or expired access token") from None
    except Exception as exc:
        logger.exception("Unexpected Supabase Auth failure: %s", type(exc).__name__)
        raise ExternalServiceError(
            "Authentication service is temporarily unavailable",
            service="supabase_auth",
            status_code=503,
        ) from None

    if not response:
        raise AuthenticationError("Invalid or expired access token")

    claims = response.get("claims")
    headers = response.get("headers")
    if not isinstance(claims, dict) or not isinstance(headers, dict):
        raise AuthenticationError("Authentication service returned invalid claims")

    algorithm = headers.get("alg")
    return _validate_claims(claims, algorithm if isinstance(algorithm, str) else None)
