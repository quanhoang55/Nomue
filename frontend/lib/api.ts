import { supabase } from "@/lib/supabase";

// ============================================================
// BACKEND ENDPOINT
// ============================================================
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured");
}

// ============================================================
// Status
// ============================================================
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = "ApiError";
    this.status = status;
  }
}

export type ApiAuthMode = "none" | "optional" | "required";

export type ApiFetchOptions = RequestInit & {
  auth?: ApiAuthMode;
};

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    return typeof payload.detail === "string"
      ? payload.detail
      : `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

// ============================================================
// Function Fetch API
// ============================================================
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const { auth = "none", ...requestOptions } = options;
  const sessionResult =
    auth === "none" ? null : await supabase.auth.getSession();
  const session = sessionResult?.data.session ?? null;

  if (sessionResult?.error && auth === "required") {
    throw new ApiError("Unable to read the authenticated session", 401);
  }

  if (auth === "required" && !session) {
    throw new ApiError("Authentication is required", 401);
  }

  async function send(accessToken?: string): Promise<Response> {
    const headers = new Headers(requestOptions.headers);
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");
    if (accessToken && auth !== "none") {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return fetch(url, { ...requestOptions, headers });
  }

  let response = await send(session?.access_token);

  if (response.status === 401 && session && auth !== "none") {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      response = await send(data.session.access_token);
    }
  }

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
