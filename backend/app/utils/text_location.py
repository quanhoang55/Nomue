# ==========================================================================
# Purpose: Pure Location Text Normalization and Matching
# ==========================================================================
import re
import unicodedata
from collections.abc import Sequence
from difflib import SequenceMatcher
from typing import Protocol


class NamedLocation(Protocol):
    name: str


# NamedLocationT = TypeVar("NamedLocationT", bound=NamedLocation)
_NON_ALPHANUMERIC_PATTERN = re.compile(r"[^a-z0-9]+")


def normalize_location_text(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.casefold().replace("đ", "d"))
    without_marks = "".join(
        character for character in decomposed if not unicodedata.combining(character)
    )
    return " ".join(_NON_ALPHANUMERIC_PATTERN.sub(" ", without_marks).split())


def split_location_components(value: str) -> list[str]:
    return [component.strip() for component in value.split(",") if component.strip()]


def location_name_score(query: str, candidate_name: str) -> float:
    normalized_query = normalize_location_text(query)
    normalized_candidate = normalize_location_text(candidate_name)
    if not normalized_query or not normalized_candidate:
        return 0.0

    components = [
        normalize_location_text(component)
        for component in split_location_components(query)
    ]
    components = [component for component in components if component]
    if normalized_candidate in components:
        return 1.0

    padded_query = f" {normalized_query} "
    padded_candidate = f" {normalized_candidate} "
    if padded_candidate in padded_query:
        return 0.95

    comparisons = components or [normalized_query]
    return max(
        SequenceMatcher(None, component, normalized_candidate).ratio()
        for component in comparisons
    )


def best_location_name_match[T: NamedLocation](
    query: str,
    candidates: Sequence[T],
    *,
    excluded_names: set[str] | None = None,
    threshold: float = 0.78,
) -> T | None:
    excluded = {normalize_location_text(name) for name in (excluded_names or set())}

    best_candidate: T | None = None
    best_score = -1.0

    if not 0.0 <= threshold <= 1.0:
        raise ValueError("threshold must be between 0 and 1")

    for candidate in candidates:
        normalized_name = normalize_location_text(candidate.name)

        if normalized_name in excluded:
            continue

        score = location_name_score(
            query,
            candidate.name,
        )

        if score > best_score:
            best_candidate = candidate
            best_score = score

    if best_score < threshold:
        return None

    return best_candidate
