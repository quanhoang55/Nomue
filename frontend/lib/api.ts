const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured");
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,

    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}
