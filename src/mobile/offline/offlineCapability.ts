/**
 * Routes / actions available while the native POS shell is offline
 * (API unreachable). Everything else should toast `mobile.requiresInternet`.
 */

export type OfflineCapability =
  | "pos"
  | "openBills"
  | "orders"
  | "shiftClose"
  | "membersCreate"
  | "menuAvailability"
  | "inventoryDraft"
  | "stocktakeDraft"
  | "qrOrders"
  | "reservations"
  | "memberSearch"
  | "gatewayPayment"
  | "promoLive"
  | "erpOther";

/** Capabilities that may run offline (draft/queue) once bootstrap is ready. */
const OFFLINE_ALLOWED: ReadonlySet<OfflineCapability> = new Set([
  "pos",
  "openBills",
  "orders",
  "membersCreate",
  "menuAvailability",
  "inventoryDraft",
  "stocktakeDraft",
  "reservations",
]);

const ROUTE_CAPABILITY: Array<{ prefix: string; capability: OfflineCapability }> = [
  { prefix: "/pos", capability: "pos" },
  { prefix: "/cashier", capability: "openBills" },
  { prefix: "/orders", capability: "orders" },
  { prefix: "/shift-close", capability: "shiftClose" },
  { prefix: "/members", capability: "membersCreate" },
  { prefix: "/menu", capability: "menuAvailability" },
  { prefix: "/inventory", capability: "inventoryDraft" },
  { prefix: "/qr-orders", capability: "qrOrders" },
  { prefix: "/reservations", capability: "reservations" },
];

export function isOfflineCapabilityAllowed(capability: OfflineCapability): boolean {
  return OFFLINE_ALLOWED.has(capability);
}

export function capabilityForPath(pathname: string): OfflineCapability {
  const path = pathname.split("?")[0] || "/";
  for (const row of ROUTE_CAPABILITY) {
    if (path === row.prefix || path.startsWith(`${row.prefix}/`)) {
      return row.capability;
    }
  }
  return "erpOther";
}

export function isPathAllowedOffline(pathname: string): boolean {
  return isOfflineCapabilityAllowed(capabilityForPath(pathname));
}

/** Inventory tabs that stay online-only even when inventory draft is allowed. */
export function isInventoryOnlineOnlyAction(action: "recalculate" | "approve" | "delete"): boolean {
  return action === "recalculate" || action === "approve" || action === "delete";
}
