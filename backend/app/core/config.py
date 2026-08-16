# ==========================================================================
# Purpose: Backend Configuration
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from functools import lru_cache
from pathlib import Path
from typing import Literal, Self
from urllib.parse import urlparse

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# ==========================================================================
# PARAMETERS
# ==========================================================================
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"


# ==========================================================================
# CLASSES / DATA STRUCTURE: Setting
# ==========================================================================
class Settings(BaseSettings):
    app_env: Literal["development", "testing", "production"] = "development"
    app_name: str = Field(default="Nomue", min_length=1, max_length=100)
    app_debug: bool = False
    api_v1_prefix: str = "/api/v1"

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    log_json: bool = False

    supabase_url: str = Field(min_length=1)
    supabase_secret_key: SecretStr

    gemini_api_key: SecretStr | None = None
    google_places_api_key: SecretStr | None = None
    revenuecat_api_key: SecretStr | None = None
    revenuecat_webhook_secret: SecretStr | None = None

    jwt_audience: str = Field(default="authenticated", min_length=1)
    jwt_clock_skew_seconds: int = Field(default=10, ge=0, le=60)
    request_timeout_seconds: float = Field(default=10.0, gt=0, le=60)
    location_max_match_distance_km: float = Field(
        default=75.0,
        gt=0,
    )

    cors_allowed_origins: list[str] = Field(default_factory=list)
    trusted_hosts: list[str] = Field(
        default_factory=lambda: ["localhost", "127.0.0.1", "testserver"]
    )

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        env_ignore_empty=True,
        populate_by_name=True,
        validate_default=True,
        frozen=True,
    )

    # ======================================================================
    # VALIDATION
    # ======================================================================
    @field_validator("api_v1_prefix")
    @classmethod
    def validate_api_v1_prefix(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.startswith("/"):
            raise ValueError("api_v1_prefix must start with '/'")
        if normalized != "/" and normalized.endswith("/"):
            normalized = normalized.rstrip("/")
        return normalized

    @field_validator("supabase_url")
    @classmethod
    def validate_supabase_url(cls, value: str) -> str:
        normalized = value.strip().rstrip("/")
        parsed = urlparse(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("supabase_url must be an absolute HTTP(S) URL")
        if parsed.username or parsed.password:
            raise ValueError("supabase_url must not contain credentials")
        if parsed.query or parsed.fragment:
            raise ValueError("supabase_url must not contain a query or fragment")
        return normalized

    @field_validator("cors_allowed_origins")
    @classmethod
    def normalize_cors_origins(cls, values: list[str]) -> list[str]:
        normalized_origins: list[str] = []
        for value in values:
            origin = value.strip().rstrip("/")
            if not origin:
                continue
            if origin != "*":
                parsed = urlparse(origin)
                if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                    raise ValueError(f"invalid CORS origin: {origin}")
                if parsed.username or parsed.password:
                    raise ValueError(
                        f"CORS origin must not contain credentials: {origin}"
                    )
                if parsed.path or parsed.query or parsed.fragment:
                    raise ValueError(f"CORS origin must not contain a path: {origin}")
            normalized_origins.append(origin)
        return list(dict.fromkeys(normalized_origins))

    @field_validator("trusted_hosts")
    @classmethod
    def normalize_trusted_hosts(cls, values: list[str]) -> list[str]:
        normalized = list(dict.fromkeys(value.strip() for value in values if value))
        if not normalized:
            raise ValueError("trusted_hosts must contain at least one host")
        if any("://" in host or "/" in host for host in normalized):
            raise ValueError("trusted_hosts entries must contain hostnames only")
        return normalized

    @model_validator(mode="after")
    def validate_environment_security(self) -> Self:
        secret_key = self.supabase_secret_key.get_secret_value().strip()
        if len(secret_key) < 20:
            raise ValueError("supabase_secret_key is too short")

        unsafe_markers = {"change-me", "changeme", "placeholder", "your-key"}
        if any(marker in secret_key.casefold() for marker in unsafe_markers):
            raise ValueError("supabase_secret_key contains a placeholder value")
        if secret_key.startswith("sb_publishable_"):
            raise ValueError("supabase_secret_key must not use a publishable key")

        optional_secrets = {
            "gemini_api_key": self.gemini_api_key,
            "google_places_api_key": self.google_places_api_key,
            "revenuecat_api_key": self.revenuecat_api_key,
            "revenuecat_webhook_secret": self.revenuecat_webhook_secret,
        }
        for name, value in optional_secrets.items():
            if value is None:
                continue
            raw_value = value.get_secret_value().casefold()
            if any(marker in raw_value for marker in unsafe_markers):
                raise ValueError(f"{name} contains a placeholder value")

        if self.app_env == "production":
            if urlparse(self.supabase_url).scheme != "https":
                raise ValueError("production supabase_url must use HTTPS")
            if self.app_debug:
                raise ValueError("app_debug must be disabled in production")
            if self.log_level == "DEBUG":
                raise ValueError("DEBUG logging is not allowed in production")
            if "*" in self.cors_allowed_origins:
                raise ValueError("wildcard CORS origins are not allowed in production")
            if any(
                urlparse(origin).scheme != "https"
                for origin in self.cors_allowed_origins
            ):
                raise ValueError("production CORS origins must use HTTPS")
            if "*" in self.trusted_hosts:
                raise ValueError("wildcard trusted hosts are not allowed in production")

        return self

    # ======================================================================
    # COMPUTED CONFIGURATION
    # ======================================================================
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def supabase_jwt_issuer(self) -> str:
        return f"{self.supabase_url}/auth/v1"

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_jwt_issuer}/.well-known/jwks.json"


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================
@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


# ==========================================================================
# MAIN EXECUTION ENTRYPOINT
# ==========================================================================
settings: Settings = get_settings()
