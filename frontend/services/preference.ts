import { apiFetch } from "@/lib/api";

export type UserPreference = {
  id: string;
  user_id: string;
  spice_preference: number;
  sweetness_preference: number;
  sourness_preference: number;
  adventurous_preference: number;
  max_price: number | null;
  vegetarian: boolean;
  vegan: boolean;
  no_pork: boolean;
  no_beef: boolean;
  no_seafood: boolean;
  halal_preference: boolean;
  allergy_preference: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPreferenceUpdate = Partial<
  Pick<
    UserPreference,
    | "spice_preference"
    | "sweetness_preference"
    | "sourness_preference"
    | "adventurous_preference"
    | "vegetarian"
    | "vegan"
    | "no_pork"
    | "no_beef"
    | "no_seafood"
    | "halal_preference"
    | "allergy_preference"
  >
>;

export function getMyPreferences(): Promise<UserPreference> {
  return apiFetch<UserPreference>("/preferences/me", { auth: "required" });
}

export function updateMyPreferences(
  update: UserPreferenceUpdate,
): Promise<UserPreference> {
  return apiFetch<UserPreference>("/preferences/me", {
    auth: "required",
    body: JSON.stringify(update),
    method: "PATCH",
  });
}
