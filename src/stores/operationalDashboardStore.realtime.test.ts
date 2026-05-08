import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetOperationalMetrics = vi.fn();
const mockAdapterConnect = vi.fn();
const mockAdapterSubscribe = vi.fn();
let realtimeHandler: ((event: Record<string, unknown>) => void) | null = null;

vi.mock("@/lib/api-integration/monitoringEndpoints", () => ({
  getOperationalMetrics: (...args: unknown[]) => mockGetOperationalMetrics(...args),
}));

vi.mock("@/domain/realtimeAdapter", () => ({
  getRealtimeAdapter: () => ({
    connect: () => mockAdapterConnect(),
    subscribe: (args: { onEvent: (event: Record<string, unknown>) => void }) => {
      realtimeHandler = args.onEvent;
      mockAdapterSubscribe(args);
      return () => {
        realtimeHandler = null;
      };
    },
    onConnectionStateChange: (listener: (state: "connected" | "disconnected") => void) => {
      listener("disconnected");
      return () => undefined;
    },
  }),
}));

import { EMPTY_OFFLINE_RESILIENCE } from "@/domain/operationsTypes";
import { useOperationalDashboardStore } from "./operationalDashboardStore";

describe("operationalDashboardStore realtime updates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetOperationalMetrics.mockReset();
    mockAdapterConnect.mockReset();
    mockAdapterSubscribe.mockReset();
    realtimeHandler = null;
    useOperationalDashboardStore.getState().reset();
  });

  it("keeps polling fallback active when websocket is disconnected", async () => {
    mockGetOperationalMetrics.mockResolvedValue({
      kitchen: { queued: 3, inProgress: 2, ready: 1 },
      pendingPayments: 4,
      activeSessions: 5,
      qrQueue: 2,
      printerQueue: { pending: 1, failed: 0, printing: 1 },
      reconciliationWarnings: [{ id: "rw-1", message: "Mismatch detected", severity: "warning" }],
      updatedAt: new Date().toISOString(),
      offlineResilience: EMPTY_OFFLINE_RESILIENCE,
    });

    await useOperationalDashboardStore.getState().startMonitoring(1000);
    await vi.advanceTimersByTimeAsync(1000);

    const state = useOperationalDashboardStore.getState();
    expect(state.pollingActive).toBe(true);
    expect(state.realtimeTransport).toBe("polling");
    expect(mockAdapterConnect).toHaveBeenCalledTimes(1);
    expect(state.metrics.pendingPayments).toBe(4);
  });

  it("applies newer realtime event and ignores stale sequence", async () => {
    useOperationalDashboardStore.setState({
      metrics: {
        kitchen: { queued: 1, inProgress: 1, ready: 0 },
        pendingPayments: 2,
        activeSessions: 3,
        qrQueue: 1,
        printerQueue: { pending: 1, failed: 0, printing: 0 },
        reconciliationWarnings: [],
        updatedAt: null,
        offlineResilience: EMPTY_OFFLINE_RESILIENCE,
      },
      lastRealtimeSeq: 0,
    });

    useOperationalDashboardStore.getState().startRealtime();
    expect(realtimeHandler).toBeTypeOf("function");

    realtimeHandler?.({
      channel: "operations",
      seq: 8,
      payload: { pendingPayments: 6, activeSessions: 7 },
    });
    realtimeHandler?.({
      channel: "operations",
      seq: 5,
      payload: { pendingPayments: 1 },
    });

    const state = useOperationalDashboardStore.getState();
    expect(state.metrics.pendingPayments).toBe(6);
    expect(state.metrics.activeSessions).toBe(7);
    expect(state.lastRealtimeSeq).toBe(8);
  });
});
