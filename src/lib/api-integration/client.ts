export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:8000/api/v1";

const envToken =
  typeof import.meta.env.VITE_API_ACCESS_TOKEN === "string"
    ? import.meta.env.VITE_API_ACCESS_TOKEN.trim() || undefined
    : undefined;

let accessTokenOverride: string | undefined = undefined;

/** Passport / Sanctum bearer token for `auth:api` routes (e.g. HR). Also reads `VITE_API_ACCESS_TOKEN` from env. */
export function setApiAccessToken(token: string | undefined): void {
  accessTokenOverride = token;
}

export function getApiAccessToken(): string | undefined {
  return accessTokenOverride ?? envToken;
}

export class ApiHttpError extends Error {
  readonly name = "ApiHttpError";

  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Request failed (${response.status})`;
    throw new ApiHttpError(response.status, message, body);
  }

  return body as T;
}
