import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListDevices = vi.fn();
const mockOpenSession = vi.fn();
const mockEnqueueCommand = vi.fn();
const mockAdapterConnect = vi.fn();
const mockAdapterDisconnect = vi.fn();
let realtimeHandler: ((event: Record<string, unknown>) => void) | null = null;
let connectionStateListener: ((state: "connected" | "disconnected" | "reconnecting") => void) | null = null;

vi.mock("@/lib/api-integration/hardwareBridgeEndpoints", () => ({
  listHardwareBridgeDevices: (...args: unknown[]) => mockListDevices(...args),
  openHardwareBridgeSession: (...args: unknown[]) => mockOpenSession(...args),
  enqueueHardwareBridgeCommand: (...args: unknown[]) => mockEnqueueCommand(...args),
}));

vi.mock("@/domain/realtimeAdapter", () => ({
  getRealtimeAdapter: () => ({
    connect: () => mockAdapterConnect(),
    disconnect: () => mockAdapterDisconnect(),
    subscribe: (args: { onEvent: (event: Record<string, unknown>) => void }) => {
      realtimeHandler = args.onEvent;
      return () => {
        realtimeHandler = null;
      };
    },
    onConnectionStateChange: (listener: (state: "connected" | "disconnected" | "reconnecting") => void) => {
      connectionStateListener = listener;
      listener("disconnected");
      return () => undefined;
    },
  }),
}));

import { useHardwareBridgeStore } from "./hardwareBridgeStore";

describe("hardwareBridgeStore orchestration lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockListDevices.mockReset();
    mockOpenSession.mockReset();
    mockEnqueueCommand.mockReset();
    mockAdapterConnect.mockReset();
    mockAdapterDisconnect.mockReset();
    realtimeHandler = null;
    connectionStateListener = null;
    useHardwareBridgeStore.getState().reset();
  });

  it("keeps polling fallback active when websocket is unavailable", async () => {
    mockListDevices.mockResolvedValue([
      {
        id: 1,
        outletId: 7,
        deviceKey: "bridge-7",
        displayLabel: "Bridge Main",
        status: "active",
        lastSeenAt: new Date().toISOString(),
        revokedAt: null,
        disabledAt: null,
        reconnectCount: 0,
        capabilities: { printer: true },
        metadata: { transportHints: ["lan"] },
      },
    ]);

    await useHardwareBridgeStore.getState().startMonitoring(7, 1000);
    await vi.advanceTimersByTimeAsync(1000);

    const state = useHardwareBridgeStore.getState();
    expect(state.pollingActive).toBe(true);
    expect(state.realtimeTransport).toBe("polling");
    expect(state.bridgeStatus).toBe("online");
    expect(state.heartbeatState).toBe("healthy");
    expect(mockAdapterConnect).toHaveBeenCalledTimes(1);
    expect(mockListDevices).toHaveBeenCalledTimes(2);
  });

  it("applies realtime updates and ignores stale sequence payloads", async () => {
    useHardwareBridgeStore.setState({
      monitoredOutletId: 9,
      devices: [
        {
          id: 3,
          outletId: 9,
          deviceKey: "bridge-9",
          displayLabel: "Bridge",
          status: "offline",
          lastSeenAt: null,
          revokedAt: null,
          disabledAt: null,
          reconnectCount: 2,
          capabilities: null,
          metadata: null,
          connectionHint: "unknown",
        },
      ],
      lastRealtimeSeq: 0,
    });

    useHardwareBridgeStore.getState().startRealtime();
    expect(realtimeHandler).toBeTypeOf("function");

    realtimeHandler?.({
      channel: "printer-telemetry",
      seq: 8,
      timestamp: "2026-05-08T08:00:00.000Z",
      payload: {
        outletId: 9,
        runtimeState: "recovering",
        runtimeCapabilities: {
          transports: ["websocket", "polling"],
          spoolSupported: true,
        },
        spoolHealth: {
          queueDepth: 4,
          deadLetterCount: 1,
          avgAckLatencyMs: 110,
          retryCount: 3,
        },
        devices: [
          {
            id: 3,
            outletId: 9,
            deviceKey: "bridge-9",
            displayLabel: "Bridge",
            status: "active",
            lastSeenAt: new Date().toISOString(),
            reconnectCount: 3,
            metadata: { transportHints: ["bluetooth"] },
          },
        ],
        sessionStatus: "open",
        commandStatus: "queued",
      },
    });
    realtimeHandler?.({
      channel: "printer-telemetry",
      seq: 4,
      timestamp: "2026-05-08T08:01:00.000Z",
      payload: {
        outletId: 9,
        bridgeStatus: "offline",
        sessionStatus: "closed",
      },
    });

    const state = useHardwareBridgeStore.getState();
    expect(state.lastRealtimeSeq).toBe(8);
    expect(state.runtimeState).toBe("recovering");
    expect(state.bridgeStatus).toBe("online");
    expect(state.runtimeCapabilities.transports).toEqual(["websocket", "polling"]);
    expect(state.spoolHealth.queueDepth).toBe(4);
    expect(state.lastSessionStatus).toBe("open");
    expect(state.lastCommandStatus).toBe("queued");
    expect(state.devices[0]?.connectionHint).toBe("bluetooth");
  });

  it("suppresses duplicate events using sequence and marker timestamp", () => {
    useHardwareBridgeStore.setState({
      monitoredOutletId: 9,
      lastRealtimeSeq: 9,
      lastRealtimeMarker: "2026-05-08T09:30:00.000Z",
      runtimeState: "disconnected",
      spoolHealth: {
        queueDepth: 1,
        deadLetterCount: 0,
        avgAckLatencyMs: 50,
        retryCount: 1,
      },
    });

    useHardwareBridgeStore.getState().startRealtime();
    expect(realtimeHandler).toBeTypeOf("function");

    realtimeHandler?.({
      channel: "printer-telemetry",
      seq: 9,
      timestamp: "2026-05-08T09:20:00.000Z",
      payload: {
        outletId: 9,
        runtimeState: "degraded",
        spoolHealth: {
          queueDepth: 12,
          deadLetterCount: 3,
          avgAckLatencyMs: 600,
          retryCount: 11,
        },
      },
    });

    const state = useHardwareBridgeStore.getState();
    expect(state.runtimeState).toBe("disconnected");
    expect(state.spoolHealth.queueDepth).toBe(1);
  });

  it("maps websocket fallback/recovery connection states into runtime lifecycle", () => {
    useHardwareBridgeStore.getState().startRealtime();
    expect(connectionStateListener).toBeTypeOf("function");

    connectionStateListener?.("reconnecting");
    expect(useHardwareBridgeStore.getState().runtimeState).toBe("reconnecting");
    expect(useHardwareBridgeStore.getState().reconnectState).toBe("reconnecting");

    connectionStateListener?.("connected");
    expect(useHardwareBridgeStore.getState().runtimeState).toBe("connected");

    connectionStateListener?.("disconnected");
    expect(useHardwareBridgeStore.getState().runtimeState).toBe("disconnected");
    expect(useHardwareBridgeStore.getState().realtimeTransport).toBe("polling");
  });

  it("tracks session and command actions through store orchestration", async () => {
    mockOpenSession.mockResolvedValue({
      id: 11,
      outletId: 3,
      deviceId: 1,
      status: "open",
      openedAt: new Date().toISOString(),
      closedAt: null,
    });
    mockEnqueueCommand.mockResolvedValue({
      id: 901,
      outletId: 3,
      deviceId: 1,
      sessionId: 11,
      commandType: "PRINT_DOCUMENT",
      status: "queued",
      idempotencyKey: "k-1",
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: null,
      deadLetteredAt: null,
      deduplicated: false,
      ackedAt: null,
      nackedAt: null,
    });

    await useHardwareBridgeStore.getState().openSession({
      outletId: 3,
      deviceKey: "bridge-3",
    });
    await useHardwareBridgeStore.getState().enqueueCommand({
      outletId: 3,
      deviceKey: "bridge-3",
      commandType: "PRINT_DOCUMENT",
      payload: { documentId: 1 },
      idempotencyKey: "k-1",
    });

    const state = useHardwareBridgeStore.getState();
    expect(state.lastSessionStatus).toBe("open");
    expect(state.lastCommandStatus).toBe("queued");
  });
});
