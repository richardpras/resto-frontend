import { API_BASE_URL } from "@/lib/api-integration/client";

/**
 * Probe Laravel health (`/up`) on the same host as the API.
 * Requires CORS path `up` (see api/config/cors.php). Prefer this over bare `/api/v1`
 * so DevTools does not log a red 404 for a path with no route.
 */
export function resolveApiHealthUrl(apiBaseUrl: string = API_BASE_URL): string {
  return resolveLaravelUpUrl(apiBaseUrl);
}

/** Laravel `/up` (same host as API). */
export function resolveLaravelUpUrl(apiBaseUrl: string = API_BASE_URL): string {
  const trimmed = apiBaseUrl.replace(/\/+$/, "");
  const origin = trimmed.replace(/\/api\/v1$/i, "");
  return `${origin}/up`;
}

export type ReachabilityProbeResult = {
  ok: boolean;
  status?: number;
  timedOut?: boolean;
};

/**
 * Lightweight reachability probe — does not require auth.
 * Any HTTP response (2xx/4xx/5xx) means the API host answered → online.
 * Network errors / timeouts → unreachable.
 */
export async function probeApiReachability(
  options: { timeoutMs?: number; url?: string } = {},
): Promise<ReachabilityProbeResult> {
  const timeoutMs = options.timeoutMs ?? 4000;
  const url = options.url ?? resolveApiHealthUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      credentials: "omit",
    });
    return { ok: true, status: res.status };
  } catch (error) {
    const timedOut =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    return { ok: false, timedOut };
  } finally {
    clearTimeout(timer);
  }
}
