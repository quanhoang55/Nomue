# ==========================================================================
# Purpose: Error, Warning, Exceptions
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from collections.abc import Mapping
from http import HTTPStatus
from typing import Any


# ==========================================================================
# CLASSES / DATA STRUCTURE: Base Application Error
# ==========================================================================
class AppError(Exception):
    default_message = "An application error occurred"
    default_error_code = "application_error"
    default_status_code = HTTPStatus.INTERNAL_SERVER_ERROR

    def __init__(
        self,
        message: str | None = None,
        *,
        error_code: str | None = None,
        status_code: int | HTTPStatus | None = None,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        self.message = message or self.default_message
        self.error_code = error_code or self.default_error_code
        self.status_code = int(status_code or self.default_status_code)
        self.details = dict(details or {})
        super().__init__(self.message)

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "detail": self.message,
            "error_code": self.error_code,
        }
        if self.details:
            payload["details"] = self.details
        return payload


# ==========================================================================
# CLASSES / DATA STRUCTURE: Configuration Errors
# ==========================================================================
class ConfigurationError(AppError):
    default_message = "The application is not configured correctly"
    default_error_code = "configuration_error"
    default_status_code = HTTPStatus.INTERNAL_SERVER_ERROR


# ==========================================================================
# CLASSES / DATA STRUCTURE: Resource Errors
# ==========================================================================
class NotFoundError(AppError):
    default_message = "The requested resource was not found"
    default_error_code = "not_found"
    default_status_code = HTTPStatus.NOT_FOUND


class ValidationError(AppError):
    default_message = "The request data is invalid"
    default_error_code = "validation_error"
    default_status_code = HTTPStatus.UNPROCESSABLE_ENTITY


# ==========================================================================
# CLASSES / DATA STRUCTURE: Security Errors
# ==========================================================================
class AuthenticationError(AppError):
    default_message = "Authentication is required"
    default_error_code = "authentication_error"
    default_status_code = HTTPStatus.UNAUTHORIZED


class AuthorizationError(AppError):
    default_message = "You do not have permission to perform this action"
    default_error_code = "authorization_error"
    default_status_code = HTTPStatus.FORBIDDEN


class RateLimitError(AppError):
    default_message = "Too many requests"
    default_error_code = "rate_limit_exceeded"
    default_status_code = HTTPStatus.TOO_MANY_REQUESTS

    def __init__(
        self,
        message: str | None = None,
        *,
        retry_after: int | None = None,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        merged_details = dict(details or {})
        if retry_after is not None:
            merged_details["retry_after"] = max(0, retry_after)
        super().__init__(message, details=merged_details)
        self.retry_after = None if retry_after is None else max(0, retry_after)


# ==========================================================================
# CLASSES / DATA STRUCTURE: External Service Errors
# ==========================================================================
class ExternalServiceError(AppError):
    default_message = "An external service is unavailable"
    default_error_code = "external_service_error"
    default_status_code = HTTPStatus.BAD_GATEWAY

    def __init__(
        self,
        message: str | None = None,
        *,
        service: str | None = None,
        status_code: int | HTTPStatus | None = None,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        merged_details = dict(details or {})
        if service:
            merged_details["service"] = service
        super().__init__(message, status_code=status_code, details=merged_details)
        self.service = service


class GeminiError(ExternalServiceError):
    default_message = "The recommendation service is unavailable"
    default_error_code = "gemini_error"


class GooglePlacesError(ExternalServiceError):
    default_message = "The places service is unavailable"
    default_error_code = "google_places_error"


class DatabaseError(ExternalServiceError):
    default_message = "The database service is unavailable"
    default_error_code = "database_error"
    default_status_code = HTTPStatus.SERVICE_UNAVAILABLE

    def __init__(
        self,
        message: str | None = None,
        *,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message,
            service="supabase",
            status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            details=details,
        )
