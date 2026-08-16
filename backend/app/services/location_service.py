# ==========================================================================
# Purpose: Resolve Text or GPS Input to Nomue Location Data
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from uuid import UUID

from app.core.exceptions import DatabaseError, NotFoundError
from app.core.exceptions import ValidationError as DomainValidationError
from app.repositories.local_area_repository import ILocalAreaRepository
from app.repositories.province_repository import IProvinceRepository
from app.schemas.location import (
    LocationResolveRequest,
    ProvinceResponse,
    ResolvedLocation,
)
from app.utils.geo import nearest_local_area
from app.utils.text_location import (
    best_location_name_match,
    split_location_components,
)


class LocationService:
    def __init__(
        self,
        local_area_repo: ILocalAreaRepository,
        province_repo: IProvinceRepository,
        max_match_distance_km: float,
    ) -> None:
        if max_match_distance_km <= 0:
            raise ValueError("max_match_distance_km must be positive")
        self.local_area_repo = local_area_repo
        self.province_repo = province_repo
        self.max_match_distance_km = max_match_distance_km

    async def resolve(self, request: LocationResolveRequest) -> ResolvedLocation:
        if request.text is not None:
            return await self._resolve_text(request.text)
        if request.latitude is None or request.longitude is None:
            raise DomainValidationError("GPS coordinates are required")
        return await self._resolve_gps(request.latitude, request.longitude)

    async def _resolve_gps(self, latitude: float, longitude: float) -> ResolvedLocation:
        areas = await self.local_area_repo.list_candidates()
        nearest = nearest_local_area(latitude, longitude, areas)
        if nearest is None:
            raise NotFoundError("Location not found")

        local_area, distance_km = nearest
        if distance_km > self.max_match_distance_km:
            raise NotFoundError("Location not found")

        province = await self._get_related_province(local_area.province_id)
        return ResolvedLocation(province=province, local_area=local_area)

    async def _resolve_text(self, text: str) -> ResolvedLocation:
        provinces = await self.province_repo.list_all()
        components = split_location_components(text)

        if len(components) >= 2:
            local_area_query = components[0]
            province_query = components[-1]

            province = best_location_name_match(
                province_query,
                provinces,
            )

            if province is None:
                raise NotFoundError("Location not found")

            areas = await self.local_area_repo.list_for_province(province.id)

            local_area = best_location_name_match(
                local_area_query,
                areas,
            )

            if local_area is None:
                raise NotFoundError("Location not found")

            return ResolvedLocation(
                province=province,
                local_area=local_area,
            )

        province = best_location_name_match(components[0], provinces)

        if province is not None:
            return ResolvedLocation(province=province, local_area=None)

        areas = await self.local_area_repo.list_candidates()
        local_area = best_location_name_match(components[0], areas)
        if local_area is None:
            raise NotFoundError("Location not found")

        province = await self._get_related_province(local_area.province_id)
        return ResolvedLocation(province=province, local_area=local_area)

    async def _get_related_province(self, province_id: UUID) -> ProvinceResponse:
        province = await self.province_repo.get_by_id(province_id)
        if province is None:
            raise DatabaseError("Location data references an unknown province")
        return province
