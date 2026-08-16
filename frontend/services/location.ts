import { apiFetch } from "@/lib/api";

export type Province = {
  id: string;
  name: string;
};

export type LocalArea = {
  id: string;
  province_id: string;
  name: string;
  area_type: string;
  latitude: number;
  longitude: number;
};

export type ResolvedLocation = {
  province: Province;
  local_area: LocalArea | null;
};

export type LocationResolveRequest =
  | { text: string; latitude?: never; longitude?: never }
  | { text?: never; latitude: number; longitude: number };

export function resolveLocation(
  request: LocationResolveRequest,
): Promise<ResolvedLocation> {
  return apiFetch<ResolvedLocation>("/locations/resolve", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
