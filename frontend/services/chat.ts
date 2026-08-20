import { apiFetch } from "@/lib/api";
import type { Dish } from "@/services/dish";
import type { LocalArea, Province } from "@/services/location";

// ==========================================================================
// Types: Chat Request
// ==========================================================================
export type ChatLocationRequest =
  | { text: string; latitude?: never; longitude?: never }
  | { text?: never; latitude: number; longitude: number };

export type ChatRequest = {
  message: string;
  location?: ChatLocationRequest | null;
  location_source?: ChatLocationSource | null;
};

export type ChatLocationSource = "user_selected" | "device_gps";

// ==========================================================================
// Types: Chat Response
// ==========================================================================
export type ChatDishRecommendation = {
  dish: Dish;
  reason: string;
};

export type ChatRestaurantRecommendation = {
  google_place_id: string | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  google_maps_uri: string | null;
  related_dish_ids: string[];
  reason: string | null;
};

export type ChatLocation = {
  province: Province;
  local_area: LocalArea | null;
  latitude: number | null;
  longitude: number | null;
  coordinate_source: "gps" | "resolved_local_area" | null;
  selection_source:
    | "message"
    | "user_selected"
    | "device_gps"
    | "legacy_request";
};

export type MapsGroundingSource = {
  title: string | null;
  uri: string | null;
  google_place_id: string | null;
  review_id: string | null;
};

export type MapsGrounding = {
  sources: MapsGroundingSource[];
  widget_context_tokens: string[];
  grounding_signatures: string[];
};

export type ChatResponse = {
  summary: string;
  paragraph: string;
  recommended_dishes: ChatDishRecommendation[];
  recommended_restaurants: ChatRestaurantRecommendation[];
  location: ChatLocation | null;
  maps_grounding: MapsGrounding | null;
};

// ==========================================================================
// Function: Create a Food Recommendation Chat Response
// ==========================================================================
export function createChatResponse(request: ChatRequest): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/chat", {
    method: "POST",
    auth: "required",
    body: JSON.stringify(request),
  });
}
