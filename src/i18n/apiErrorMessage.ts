import type { TFunction } from "i18next";
import { ApiHttpError } from "@/lib/api-integration/client";

/**
 * Formats API errors for display. When Accept-Language is sent, the server message
 * is already localized. Optional client-side key mapping via erp.api.*.
 */
export function formatApiErrorMessage(error: unknown, t?: TFunction): string {
  if (error instanceof ApiHttpError) {
    const body = error.body;
    if (t && typeof body === "object" && body !== null && "errorKey" in body) {
      const key = String((body as { errorKey: unknown }).errorKey);
      const mapped = t(`api.${key}`, { defaultValue: "" });
      if (mapped && mapped !== `api.${key}`) return mapped;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return t?.("shared.somethingWrong", { ns: "ops" }) ?? "Something went wrong.";
}
