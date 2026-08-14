# ==========================================================================
# Purpose: Error, Warning, Exceptions
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================

# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================

# Base
class AppError(Exception):
    pass


# Child
class ConfigurationError(AppError):
    pass


class ExternalServiceError(AppError):
    pass


class NotFoundError(AppError):
    pass


class ValidationError(AppError):
    pass


class AuthenticationError(AppError):
    pass


class AuthorizationError(AppError):
    pass


class RateLimitError(AppError):
    pass


class GeminiError(AppError):
    pass


class GooglePlacesError(AppError):
    pass


class DatabaseError(AppError):
    pass
