export interface NormalizedApiError {
  statusCode: number | null;
  message: string;
  fieldErrors: Record<string, string[]>;
  isAuthError: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFieldErrors(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};

  const normalized: Record<string, string[]> = {};
  for (const [field, entry] of Object.entries(value)) {
    if (Array.isArray(entry)) {
      normalized[field] = entry.filter((item): item is string => typeof item === "string");
      continue;
    }
    if (typeof entry === "string") {
      normalized[field] = [entry];
    }
  }
  return normalized;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  const fallback: NormalizedApiError = {
    statusCode: null,
    message: "Unexpected error",
    fieldErrors: {},
    isAuthError: false,
  };

  if (!isRecord(error)) return fallback;

  const statusCode = typeof error.status === "number" ? error.status : null;
  const body = isRecord(error.body) ? error.body : undefined;
  const bodyMessage = body && typeof body.message === "string" ? body.message : undefined;
  const message =
    typeof error.message === "string" && error.message.trim() !== ""
      ? error.message
      : bodyMessage ?? fallback.message;
  const fieldErrors = body ? toFieldErrors(body.errors) : {};
  const isAuthError = statusCode === 401 || statusCode === 403;

  return { statusCode, message, fieldErrors, isAuthError };
}
