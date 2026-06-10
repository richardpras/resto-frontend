import { describe, expect, it } from "vitest";
import {
  emptyOperationalMetricsViewModel,
  mapMonitoringMetrics,
  mapReconciliationWarnings,
  mergeOperationalMetrics,
} from "@/lib/api-integration/monitoringMapper";

describe("mapMonitoringMetrics", () => {
  it("maps reconciliationFailures to reconciliationWarnings", () => {
    const view = mapMonitoringMetrics({
      reconciliationFailures: { count: 4 },
    });
    expect(view.reconciliationWarnings).toHaveLength(1);
    expect(view.reconciliationWarnings[0]?.message).toContain("4 reconciliation issues");
  });

  it("maps pendingKitchenTickets.count to kitchen.queued", () => {
    const view = mapMonitoringMetrics({
      pendingKitchenTickets: { count: 8 },
    });
    expect(view.kitchen.queued).toBe(8);
  });

  it("maps stalePayments.count to pendingPayments", () => {
    const view = mapMonitoringMetrics({
      stalePayments: { count: 2 },
    });
    expect(view.pendingPayments).toBe(2);
  });

  it("maps activePosSessions.count to activeSessions", () => {
    const view = mapMonitoringMetrics({
      activePosSessions: { count: 5 },
    });
    expect(view.activeSessions).toBe(5);
  });

  it("maps hardwareBridge.deadLetterCount to hardware.deadLetters", () => {
    const view = mapMonitoringMetrics({
      hardwareBridge: { deadLetterCount: 3, staleBridges: 1 },
    });
    expect(view.hardware.deadLetters).toBe(3);
    expect(view.hardware.staleBridges).toBe(1);
  });

  it("maps offlineResilience replay failures to offlineSync.failures", () => {
    const view = mapMonitoringMetrics({
      offlineResilience: {
        syncReplayFailures: 6,
        syncConflictOperations: 2,
      },
    });
    expect(view.offlineSync.failures).toBe(6);
    expect(view.offlineSync.conflicts).toBe(2);
  });
});

describe("mapReconciliationWarnings", () => {
  it("returns empty array when count is zero", () => {
    expect(mapReconciliationWarnings({ count: 0 })).toEqual([]);
  });
});

describe("mergeOperationalMetrics", () => {
  it("maps backend-shaped realtime patch", () => {
    const merged = mergeOperationalMetrics(emptyOperationalMetricsViewModel(), {
      stalePayments: { count: 9 },
      activePosSessions: { count: 4 },
    });
    expect(merged.pendingPayments).toBe(9);
    expect(merged.activeSessions).toBe(4);
  });

  it("merges view-model partial patch", () => {
    const merged = mergeOperationalMetrics(emptyOperationalMetricsViewModel(), {
      pendingPayments: 6,
      activeSessions: 7,
    });
    expect(merged.pendingPayments).toBe(6);
    expect(merged.activeSessions).toBe(7);
  });
});
