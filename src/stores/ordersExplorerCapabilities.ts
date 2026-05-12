import type { AuthUser } from "@/stores/authStore";
import { PERMISSIONS } from "@/stores/authStore";

export type OrdersExplorerUiCaps = {
  /** POS event / operator timeline (audit). */
  canViewAuditTimeline: boolean;
  /** Item recovery events and item-level recovery snapshot (backend `orders.recovery.read`). */
  canViewRecoveryTimeline: boolean;
  /** Manager / Owner: approve or clear item recovery (backend `orders.recovery.approve`). */
  canApproveItemRecovery: boolean;
  /** Customer receipt history preview / reprint (backend `permission:pos.use`). */
  canUseReceiptActions: boolean;
  /** Show guidance that refunds/voids stay in POS / existing flows. */
  showOperationalCorrectionHint: boolean;
};

/**
 * Frontend-only visibility. Backend routes remain authoritative (`pos.use`, outlet scope, etc.).
 */
export function getOrdersExplorerUiCaps(user: AuthUser | null): OrdersExplorerUiCaps {
  if (!user) {
    return {
      canViewAuditTimeline: false,
      canViewRecoveryTimeline: false,
      canApproveItemRecovery: false,
      canUseReceiptActions: false,
      showOperationalCorrectionHint: false,
    };
  }
  const role = user.role;
  const perms = new Set(user.permissions);
  const hasPos = perms.has(PERMISSIONS.POS);
  const canViewRecovery = perms.has("orders.recovery.read");
  const isElevated = role === "Owner" || role === "Manager";
  const canApproveRecovery = isElevated && perms.has("orders.recovery.approve");
  return {
    canViewAuditTimeline: hasPos,
    canViewRecoveryTimeline: canViewRecovery,
    canApproveItemRecovery: canApproveRecovery,
    canUseReceiptActions: hasPos,
    showOperationalCorrectionHint: isElevated,
  };
}
