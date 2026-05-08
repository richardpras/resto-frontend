import { beforeEach, describe, expect, it } from "vitest";
import { clearMemoryQueueForTests, countMemoryQueueForTests } from "@/lib/offline/offlineOperationQueue";
import { useOfflineSyncStore } from "./offlineSyncStore";

describe("offlineSyncStore", () => {
  beforeEach(() => {
    clearMemoryQueueForTests();
    useOfflineSyncStore.setState({
      pendingQueueCount: 0,
      syncPhase: "idle",
      lastSyncError: null,
      lastBatchConflictCount: 0,
      isOnline: true,
      listenersAttached: false,
    });
  });

  it("dedupes fingerprints for the same outlet in the local queue", async () => {
    await useOfflineSyncStore.getState().enqueueReplayableOperation({
      outletId: 5,
      fingerprint: "shared-fingerprint",
      operationType: "kitchen.ticket.status",
      payload: { kitchenTicketId: 99, status: "in_progress" },
    });
    await useOfflineSyncStore.getState().enqueueReplayableOperation({
      outletId: 5,
      fingerprint: "shared-fingerprint",
      operationType: "kitchen.ticket.status",
      payload: { kitchenTicketId: 99, status: "ready" },
    });

    expect(countMemoryQueueForTests(5)).toBe(1);
    expect(useOfflineSyncStore.getState().pendingQueueCount).toBe(1);
  });
});
