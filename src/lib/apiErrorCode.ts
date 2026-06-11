import { ApiHttpError } from "@/lib/api-integration/client";

export function getApiErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiHttpError)) return null;
  const body = error.body;
  if (typeof body !== "object" || body === null || !("code" in body)) return null;
  const code = (body as { code: unknown }).code;
  return typeof code === "string" ? code : null;
}
