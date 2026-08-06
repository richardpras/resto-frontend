import { describe, expect, it } from "vitest";
import { collectPendingOrderSyncKeys, isOrderPendingSync } from "./orderPendingSync";
import type { QueuedOfflineOperation } from "@/lib/offline/offlineOperationQueue";

function op(partial: Partial<QueuedOfflineOperation> & { payload: Record<string, unknown> }): QueuedOfflineOperation {
  return {
    id: partial.id ?? "1",
    outletId: partial.outletId ?? 1,
    fingerprint: partial.fingerprint ?? "fp",
    operationType: partial.operationType ?? "order.add_payments",
    payload: partial.payload,
    clientOccurredAt: null,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
}

describe("orderPendingSync", () => {
  it("marks local:* orders as pending even without queue rows", () => {
    expect(isOrderPendingSync({ id: "local:abc", code: "L1" }, new Set())).toBe(true);
  });

  it("matches queued numeric order id and offline code", () => {
    const keys = collectPendingOrderSyncKeys([
      op({ payload: { orderId: 99, localOrderCode: "LXYZ" } }),
    ]);
    expect(isOrderPendingSync({ id: "99", code: "ORD-99" }, keys)).toBe(true);
    expect(isOrderPendingSync({ id: "55", code: "LXYZ" }, keys)).toBe(true);
    expect(isOrderPendingSync({ id: "55", code: "OTHER" }, keys)).toBe(false);
  });
});
