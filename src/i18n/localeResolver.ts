export const SUPPORTED_APP_LOCALES = ["en", "id"] as const;
export type AppLocale = (typeof SUPPORTED_APP_LOCALES)[number];

export function normalizeAppLocale(raw: string | null | undefined): AppLocale {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "id" || value.startsWith("id-") || value.startsWith("id_")) {
    return "id";
  }
  return "en";
}

export function detectBrowserLocale(
  languages: readonly string[] = typeof navigator !== "undefined"
    ? [navigator.language, ...(navigator.languages ?? [])]
    : [],
): AppLocale {
  for (const lang of languages) {
    const normalized = normalizeAppLocale(lang);
    if (normalized === "id") return "id";
  }
  return "en";
}

export function resolveInitialLocale(): AppLocale {
  return detectBrowserLocale();
}
