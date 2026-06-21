/** Browser staff app routes (frontend origin, not API /api/v1). */

export function normalizeWebAppOrigin(origin: string): string {
  let base = origin.trim().replace(/\/+$/, "");
  if (!base) return "";
  base = base.replace(/\/api\/v1\/?$/i, "").replace(/\/api\/?$/i, "");
  return base.replace(/\/+$/, "");
}

export function settingsPrintersPath(): string {
  return "/settings?tab=printers";
}

export function settingsPrintersUrl(origin: string = typeof window !== "undefined" ? window.location.origin : ""): string {
  const base = normalizeWebAppOrigin(origin);
  if (!base) return settingsPrintersPath();
  return `${base}${settingsPrintersPath()}`;
}
