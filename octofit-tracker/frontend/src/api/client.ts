// Relative /api paths go through the Vite dev proxy, so port 8000 never needs to be public.
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export class ApiError extends Error {
  constructor(public status: number) {
    super(`Request failed with ${status}`);
  }
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}
