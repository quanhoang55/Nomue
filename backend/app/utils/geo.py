# ==========================================================================
# Purpose: Pure Geographic Calculations
# ==========================================================================
from collections.abc import Sequence
from math import asin, cos, radians, sin, sqrt

from app.schemas.location import LocalAreaResponse

EARTH_RADIUS_KM = 6371.0088


def haversine_distance_km(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    latitude_delta = radians(latitude_b - latitude_a)
    longitude_delta = radians(longitude_b - longitude_a)
    latitude_a_radians = radians(latitude_a)
    latitude_b_radians = radians(latitude_b)

    haversine = sin(latitude_delta / 2) ** 2 + (
        cos(latitude_a_radians)
        * cos(latitude_b_radians)
        * sin(longitude_delta / 2) ** 2
    )

    haversine = min(
        1.0,
        max(0.0, haversine),
    )

    return 2 * EARTH_RADIUS_KM * asin(sqrt(haversine))


def nearest_local_area(
    latitude: float,
    longitude: float,
    areas: Sequence[LocalAreaResponse],
) -> tuple[LocalAreaResponse, float] | None:
    if not areas:
        return None

    ranked = (
        (
            haversine_distance_km(
                latitude,
                longitude,
                area.latitude,
                area.longitude,
            ),
            str(area.id),
            area,
        )
        for area in areas
    )
    distance, _area_id, area = min(ranked, key=lambda result: (result[0], result[1]))
    return area, distance
