export const SUPPORTED_APP_LOCALES = ["en", "id"] as const;
export type AppLocale = (typeof SUPPORTED_APP_LOCALES)[number];

export const GUEST_LOCALE_STORAGE_KEY = "resto-guest-locale";

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

export function readGuestLocaleFromStorage(): AppLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_LOCALE_STORAGE_KEY);
    if (!raw?.trim()) return null;
    return normalizeAppLocale(raw);
  } catch {
    return null;
  }
}

export function writeGuestLocaleToStorage(locale: AppLocale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_LOCALE_STORAGE_KEY, normalizeAppLocale(locale));
  } catch {
    // ignore quota / private mode
  }
}

export function resolveGuestLocale(searchParams?: URLSearchParams): AppLocale {
  const fromQuery = searchParams?.get("lang");
  if (fromQuery?.trim()) {
    return normalizeAppLocale(fromQuery);
  }
  const stored = readGuestLocaleFromStorage();
  if (stored !== null) return stored;
  return detectBrowserLocale();
}

export function appendGuestLangToHref(href: string, searchParams?: URLSearchParams): string {
  const lang = searchParams?.get("lang")?.trim();
  if (!lang) {
    const stored = readGuestLocaleFromStorage();
    if (!stored) return href;
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}lang=${stored}`;
  }
  const normalized = normalizeAppLocale(lang);
  const separator = href.includes("?") ? "&" : "?";
  if (href.includes("lang=")) return href;
  return `${href}${separator}lang=${normalized}`;
}
