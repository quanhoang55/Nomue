import { apiFetch } from "@/lib/api";
import type { LocationResolveRequest } from "@/services/location";

// =========================================================================
// Type: Stored Restaurant Reference
// =========================================================================
export type Restaurant = {
  id: string;
  google_place_id: string;
  dish_id: string;
  province_id: string;
  local_area_id: string | null;
  last_verified_at: string | null;
};

// =========================================================================
// Types: Grounded Restaurant Discovery
// =========================================================================
export type RestaurantDiscoveryRequest = {
  dish_id: string;
  location: LocationResolveRequest;
};

export type DiscoveredRestaurant = {
  google_place_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  google_maps_uri: string | null;
  reason: string | null;
};

// =========================================================================
// Function: Fetch Stored Restaurants for a Dish and Province
// =========================================================================
export function getRestaurants(
  dishId: string,
  provinceId: string,
): Promise<Restaurant[]> {
  const query = new URLSearchParams({
    dish_id: dishId,
    province_id: provinceId,
  });

  return apiFetch<Restaurant[]>(`/restaurants?${query.toString()}`, {
    auth: "none",
  });
}

// =========================================================================
// Function: Discover Restaurants for a Dish and Location
// =========================================================================
export function discoverRestaurants(
  request: RestaurantDiscoveryRequest,
): Promise<DiscoveredRestaurant[]> {
  return apiFetch<DiscoveredRestaurant[]>("/chat/restaurants/discover", {
    method: "POST",
    auth: "required",
    body: JSON.stringify(request),
  });
}
