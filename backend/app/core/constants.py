# ==========================================================================
# Purpose: Application Constants
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================


# ==========================================================================
# AUTHENTICATION & AUTHORIZATION
# ==========================================================================
AUTHORIZATION_HEADER = "Authorization"
BEARER_SCHEME = "Bearer"
SUPABASE_AUTHENTICATED_ROLE = "authenticated"
SUPABASE_JWT_ALLOWED_ALGORITHMS = frozenset({"ES256", "RS256", "HS256"})
SUPABASE_JWT_REQUIRED_CLAIMS = frozenset(
    {"aud", "exp", "iat", "iss", "role", "session_id", "sub"}
)
MAX_ACCESS_TOKEN_LENGTH = 8192


# ==========================================================================
# LOGGING
# ==========================================================================
DEFAULT_LOG_FORMAT = (
    "%(asctime)s | %(levelname)s | %(name)s | %(request_id)s | %(message)s"
)
REDACTED_VALUE = "[REDACTED]"
REQUEST_ID_LOG_FIELD = "request_id"


# ==========================================================================
# API LIMITS
# ==========================================================================
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
