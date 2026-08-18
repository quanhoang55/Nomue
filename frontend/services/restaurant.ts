import { apiFetch } from "@/lib/api";

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

  return apiFetch<Restaurant[]>(`/restaurants?${query.toString()}`);
}
