import { apiFetch } from "@/lib/api";

// ============================================================
// Type
// ============================================================
export type Dish = {
  id: string;
  name: string;
  description: string | null;
  spice_level: number;
  sweetness_level: number;
  sourness_level: number;
  bitterness_level: number;
  adventurous_level: number;
  typical_price: number;
};

// ============================================================
// Function
// ============================================================

export function getDish(dishId: string): Promise<Dish> {
  return apiFetch<Dish>(`/dishes/${dishId}`);
}

export function getDishes(provinceId: string): Promise<Dish[]> {
  const query = new URLSearchParams({ province_id: provinceId });
  return apiFetch<Dish[]>(`/dishes?${query.toString()}`);
}
