# ==========================================================================
# Purpose: Normalize Unicode
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import unicodedata


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================
def normalize_unicode(text: str) -> str:
    return unicodedata.normalize("NFC", text).strip()


def unicode_check(text: str) -> bool:
    return unicodedata.is_normalized("NFC", text)
