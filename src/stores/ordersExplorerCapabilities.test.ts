import { describe, expect, it } from "vitest";
import { getOrdersExplorerUiCaps } from "./ordersExplorerCapabilities";
import type { AuthUser } from "./authStore";

function user(partial: Partial<AuthUser>): AuthUser {
  return {
    id: "1",
    name: "T",
    email: "t@test",
    role: "Cashier",
    outletIds: [1],
    pinSet: false,
    permissions: ["pos.use"],
    ...partial,
  };
}

describe("getOrdersExplorerUiCaps", () => {
  it("allows audit and receipts for POS-enabled cashier", () => {
    const caps = getOrdersExplorerUiCaps(user({ role: "Cashier", permissions: ["pos.use"] }));
    expect(caps.canViewAuditTimeline).toBe(true);
    expect(caps.canUseReceiptActions).toBe(true);
    expect(caps.canViewRecoveryTimeline).toBe(false);
    expect(caps.canApproveItemRecovery).toBe(false);
    expect(caps.showOperationalCorrectionHint).toBe(false);
  });

  it("shows manager hint for Manager with POS", () => {
    const caps = getOrdersExplorerUiCaps(user({ role: "Manager", permissions: ["pos.use"] }));
    expect(caps.showOperationalCorrectionHint).toBe(true);
  });

  it("allows recovery timeline when orders.recovery.read is granted", () => {
    const caps = getOrdersExplorerUiCaps(user({ role: "Cashier", permissions: ["orders.recovery.read"] }));
    expect(caps.canViewRecoveryTimeline).toBe(true);
    expect(caps.canViewAuditTimeline).toBe(false);
    expect(caps.canApproveItemRecovery).toBe(false);
  });

  it("allows recovery approval only for Owner/Manager with orders.recovery.approve", () => {
    expect(
      getOrdersExplorerUiCaps(user({ role: "Cashier", permissions: ["orders.recovery.read", "orders.recovery.approve"] }))
        .canApproveItemRecovery,
    ).toBe(false);
    expect(
      getOrdersExplorerUiCaps(user({ role: "Manager", permissions: ["orders.recovery.read", "orders.recovery.approve"] }))
        .canApproveItemRecovery,
    ).toBe(true);
    expect(
      getOrdersExplorerUiCaps(user({ role: "Owner", permissions: ["orders.recovery.approve"] })).canApproveItemRecovery,
    ).toBe(true);
  });
});
