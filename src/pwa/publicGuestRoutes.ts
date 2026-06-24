const MANIFEST_ID = "staff-pwa-manifest";
const MANIFEST_HREF = "/staff.webmanifest";
const THEME_COLOR = "#0f172a";

export function isPublicGuestPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return (
    normalized.startsWith("/qr/") ||
    normalized === "/qr-order" ||
    normalized.startsWith("/payment-status")
  );
}

export function isStaffPwaPath(pathname: string): boolean {
  if (isPublicGuestPath(pathname)) return false;
  return (
    pathname === "/login" ||
    pathname.startsWith("/employee") ||
    !pathname.startsWith("/qr")
  );
}

export function injectStaffManifest(): void {
  if (document.getElementById(MANIFEST_ID)) return;
  const link = document.createElement("link");
  link.id = MANIFEST_ID;
  link.rel = "manifest";
  link.href = MANIFEST_HREF;
  document.head.appendChild(link);
}

export function removeStaffManifest(): void {
  document.getElementById(MANIFEST_ID)?.remove();
}

export function setStaffThemeColor(): void {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", THEME_COLOR);
}

export function removeStaffThemeColor(): void {
  document.querySelector('meta[name="theme-color"]')?.remove();
}
