# ==========================================================================
# Purpose: Create/Manage Supabase connection
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from supabase import AsyncClient, acreate_client

from app.core.config import settings

# ==========================================================================
# GLOBAL Client
# ==========================================================================
_supabase: AsyncClient | None = None


# ==========================================================================
# SUPABASE ASYNC CLIENT INIT
# ==========================================================================
async def get_supabase() -> AsyncClient:
    global _supabase

    if _supabase is None:
        _supabase = await acreate_client(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_secret_key.get_secret_value(),
        )

    return _supabase
