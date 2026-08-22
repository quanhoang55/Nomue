import { apiFetch } from "@/lib/api";

// ============================================================
// Type
// ============================================================
export type Dish = {
  id: string;
  dish_type_id: string | null;
  name: string;
  description: string | null;
  spice_level: number;
  sweetness_level: number;
  sourness_level: number;
  bitterness_level: number;
  adventurous_level: number;
  typical_price: number;
  importance_score?: number;
  important_score?: number;
};

export type DishType = {
  name: string;
};

// ============================================================
// Function
// ============================================================

export function getDish(dishId: string): Promise<Dish> {
  return apiFetch<Dish>(`/dishes/${dishId}`, { auth: "none" });
}

export function getDishType(dishTypeId: string): Promise<DishType> {
  return apiFetch<DishType>(`/dish-types/${dishTypeId}`, { auth: "none" });
}

export function getDishes(provinceId: string): Promise<Dish[]> {
  const query = new URLSearchParams({ province_id: provinceId });
  return apiFetch<Dish[]>(`/dishes?${query.toString()}`, { auth: "none" });
}
