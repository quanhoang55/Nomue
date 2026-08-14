# ==========================================================================
# Purpose: Backend Configuration
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# ==========================================================================
# PARAMETERS
# ==========================================================================


# ==========================================================================
# CLASSES / DATA STRUCTURE: Setting
# ==========================================================================
class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "Nomue"
    api_v1_prefix: str = "/api/v1"

    supabase_url: str
    supabase_secret_key: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================


# Cache
@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


# ==========================================================================
# MAIN EXECUTION ENTRYPOINT
# ==========================================================================
settings = get_settings()
