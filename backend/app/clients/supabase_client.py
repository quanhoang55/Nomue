# ==========================================================================
# Purpose: Create/Manage Supabase connection
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from supabase import Client, create_client

from app.core.config import settings

# ==========================================================================
# PARAMETERS
# ==========================================================================

# Supabase client init
supabase: Client = create_client(
    supabase_url=settings.supabase_url, supabase_key=settings.supabase_secret_key
)
