import { describeQueuedOperation } from "./describeQueuedOperation";
import type { QueuedOfflineOperation } from "@/lib/offline/offlineOperationQueue";

describe("describeQueuedOperation", () => {
  const base: QueuedOfflineOperation = {
    id: "1",
    outletId: 7,
    fingerprint: "fp-abcdef012345",
    operationType: "order.create",
    payload: {},
    clientOccurredAt: "2026-08-05T01:00:00.000Z",
    createdAt: "2026-08-05T01:00:00.000Z",
    retryCount: 0,
  };

  it("summarizes order.create with code and total", () => {
    const summary = describeQueuedOperation({
      ...base,
      payload: { code: "LABC123", total: 28000, clientLocalRef: "local:x" },
    });
    expect(summary.titleDefault).toBe("Create order");
    expect(summary.detail).toContain("LABC123");
    expect(summary.detail).toContain("28.000");
  });

  it("summarizes order.add_payments with amount", () => {
    const summary = describeQueuedOperation({
      ...base,
      operationType: "order.add_payments",
      payload: {
        localOrderCode: "LABC123",
        payments: [{ method: "cash", amount: 28000 }],
      },
    });
    expect(summary.titleDefault).toBe("Record payment");
    expect(summary.detail).toContain("LABC123");
    expect(summary.detail).toContain("28.000");
  });

  it("summarizes pos_session.cash_movement", () => {
    const summary = describeQueuedOperation({
      ...base,
      operationType: "pos_session.cash_movement",
      payload: { direction: "out", amount: 15000, category: "iuran" },
    });
    expect(summary.titleDefault).toBe("Cash out");
    expect(summary.detail).toContain("15.000");
    expect(summary.detail).toContain("iuran");
  });
});
