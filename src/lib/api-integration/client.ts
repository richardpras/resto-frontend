import { recordApiError } from "@/lib/diagnostics/diagnosticsBuffer";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:8000/api/v1";

const envToken =
  typeof import.meta.env.VITE_API_ACCESS_TOKEN === "string"
    ? import.meta.env.VITE_API_ACCESS_TOKEN.trim() || undefined
    : undefined;

let accessTokenOverride: string | undefined = undefined;
let unauthorizedHandler: (() => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

type RefreshTokenResponse = {
  data?: { accessToken?: string };
};

function getPersistedAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem("resto-auth");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as {
      state?: { accessToken?: unknown };
      accessToken?: unknown;
    } | null;
    const fromState = parsed?.state?.accessToken;
    const fromRoot = parsed?.accessToken;
    const token = typeof fromState === "string" ? fromState : typeof fromRoot === "string" ? fromRoot : undefined;
    return typeof token === "string" && token.trim() !== "" ? token : undefined;
  } catch {
    return undefined;
  }
}

/** Passport / Sanctum bearer token for `auth:api` routes (e.g. HR). Also reads `VITE_API_ACCESS_TOKEN` from env. */
export function setApiAccessToken(token: string | undefined): void {
  accessTokenOverride = token;
}

export function getApiAccessToken(): string | undefined {
  return accessTokenOverride ?? envToken ?? getPersistedAccessToken();
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

export type RequestObservabilityMetadata = {
  scope: string;
  action: string;
  requestId?: number;
  retryCount?: number;
  recovery?: boolean;
};

export function createObservabilityHeaders(
  metadata?: RequestObservabilityMetadata,
): Record<string, string> {
  if (!metadata) return {};
  return {
    "X-Client-Scope": metadata.scope,
    "X-Client-Action": metadata.action,
    ...(typeof metadata.requestId === "number"
      ? { "X-Client-Request-Id": String(metadata.requestId) }
      : {}),
    ...(typeof metadata.retryCount === "number"
      ? { "X-Client-Retry-Count": String(metadata.retryCount) }
      : {}),
    ...(metadata.recovery ? { "X-Client-Recovery": "1" } : {}),
  };
}

async function persistRefreshedAccessToken(accessToken: string): Promise<void> {
  setApiAccessToken(accessToken);
  if (typeof window === "undefined") return;
  const { useAuthStore } = await import("@/stores/authStore");
  useAuthStore.setState({ accessToken });
}

export async function refreshAccessToken(): Promise<boolean> {
  const token = getApiAccessToken();
  if (!token) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const body = (await response.json().catch(() => null)) as RefreshTokenResponse | null;
      const nextToken = body?.data?.accessToken;
      if (!response.ok || typeof nextToken !== "string" || nextToken.trim() === "") {
        return false;
      }
      await persistRefreshedAccessToken(nextToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  options?: { skipAuthRecovery?: boolean; isRetry?: boolean },
): Promise<T> {
  const token = getApiAccessToken();
  const mergedHeaders = new Headers(init?.headers ?? {});
  if (!mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }
  if (!mergedHeaders.has("Accept")) {
    mergedHeaders.set("Accept", "application/json");
  }
  if (token && !mergedHeaders.has("Authorization")) {
    mergedHeaders.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: mergedHeaders,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (
      response.status === 401 &&
      !options?.skipAuthRecovery &&
      !options?.isRetry &&
      path !== "/auth/login" &&
      path !== "/auth/refresh"
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiRequest<T>(path, init, { ...options, isRetry: true });
      }
      unauthorizedHandler?.();
    }

    const message =
      typeof body === "object" && body !== null && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Request failed (${response.status})`;
    recordApiError(path, response.status, message, body);
    throw new ApiHttpError(response.status, message, body);
  }

  return body as T;
}
