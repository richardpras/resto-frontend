// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PrinterSettings from "./PrinterSettings";
import type { RealtimeConnectionState } from "@/domain/realtimeAdapter";
import type {
  HardwareBridgeHealthState,
  HardwareBridgeHeartbeatState,
  HardwareBridgeReconnectState,
  HardwareBridgeRuntimeState,
} from "@/domain/hardwareBridgeAdapters";

const fetchQueueStatusMock = vi.fn();
const fetchBridgeSnapshotMock = vi.fn();
const startBridgeMonitoringMock = vi.fn();
type BridgeStoreFixture = {
  bridgeStatus: HardwareBridgeHealthState;
  heartbeatState: HardwareBridgeHeartbeatState;
  reconnectState: HardwareBridgeReconnectState;
  runtimeState: HardwareBridgeRuntimeState;
  runtimeCapabilities: {
    transports: string[];
    capabilities: string[];
    spoolSupported: boolean;
  };
  spoolHealth: {
    queueDepth: number;
    deadLetterCount: number;
    avgAckLatencyMs: number;
    retryCount: number;
  };
  executionLifecycle: {
    queued: number;
    executing: number;
    acknowledged: number;
    failed: number;
    retryPending: number;
    deadLetter: number;
  };
  provisioning: {
    status: string;
    pairedOutletIdentity: string | null;
    pairedDeviceIdentity: string | null;
    deviceFingerprint: string | null;
    tokenHealth: string;
    tokenRotationDue: boolean;
  };
  watchdog: {
    state: string;
    restartCount: number;
    crashCount: number;
    stalledSpoolDetected: boolean;
    freezeDetected: boolean;
  };
  runtime: {
    version: string;
    deploymentMode: string;
    serviceMode: string;
    trayMode: string;
    updateChannel: string;
    updateAvailable: boolean;
    updateTargetVersion: string | null;
    updateRestartRequired: boolean;
  };
  realtimeTransport: "polling" | "websocket";
  realtimeState: RealtimeConnectionState;
  devices: unknown[];
  isLoading: boolean;
  initialLoading: boolean;
  backgroundRefreshing: boolean;
  hasLoadedOnce: boolean;
  error: string | null;
  fetchSnapshot: typeof fetchBridgeSnapshotMock;
  startMonitoring: typeof startBridgeMonitoringMock;
  stopMonitoring: () => void;
};

const bridgeStoreState: BridgeStoreFixture = {
  bridgeStatus: "online",
  heartbeatState: "healthy",
  reconnectState: "stable",
  runtimeState: "degraded",
  runtimeCapabilities: {
    transports: ["websocket", "polling"],
    capabilities: ["print", "status", "spool"],
    spoolSupported: true,
  },
  spoolHealth: {
    queueDepth: 7,
    deadLetterCount: 2,
    avgAckLatencyMs: 320,
    retryCount: 5,
  },
  executionLifecycle: {
    queued: 7,
    executing: 1,
    acknowledged: 14,
    failed: 2,
    retryPending: 3,
    deadLetter: 2,
  },
  provisioning: {
    status: "paired",
    pairedOutletIdentity: "OUT-1",
    pairedDeviceIdentity: "bridge-main",
    deviceFingerprint: "fp-abc-123",
    tokenHealth: "healthy",
    tokenRotationDue: false,
  },
  watchdog: {
    state: "degraded",
    restartCount: 2,
    crashCount: 1,
    stalledSpoolDetected: true,
    freezeDetected: false,
  },
  runtime: {
    version: "16.3.0",
    deploymentMode: "headless",
    serviceMode: "windows-service",
    trayMode: "hidden",
    updateChannel: "stable",
    updateAvailable: true,
    updateTargetVersion: "16.3.1",
    updateRestartRequired: true,
  },
  realtimeTransport: "polling",
  realtimeState: "disconnected",
  devices: [
    {
      id: 12,
      outletId: 1,
      deviceKey: "bridge-main",
      displayLabel: "Bridge Front",
      status: "active",
      lastSeenAt: "2026-05-08T07:00:00.000Z",
      revokedAt: null,
      disabledAt: null,
      reconnectCount: 1,
      capabilities: { print: true },
      metadata: { transportHints: ["lan", "bluetooth"] },
      connectionHint: "lan",
    },
  ],
  isLoading: false,
  initialLoading: false,
  backgroundRefreshing: false,
  hasLoadedOnce: true,
  error: null,
  fetchSnapshot: fetchBridgeSnapshotMock,
  startMonitoring: startBridgeMonitoringMock,
  stopMonitoring: vi.fn(),
};

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (s: unknown) => unknown) =>
    selector({
      printers: [
        {
          id: "p-1",
          name: "Kitchen A",
          printerType: "kitchen",
          connection: "lan",
          ip: "192.168.1.5",
          outletId: 1,
          assignedCategories: ["Main"],
        },
      ],
      outlets: [{ id: 1, code: "OUT-1", name: "Main", address: "", phone: "", manager: "", status: "active" }],
      upsertPrinter: vi.fn(),
      refreshFromApi: vi.fn(),
    }),
  newId: () => "new-printer",
  removePrinterCascade: vi.fn(),
}));

vi.mock("@/stores/printerManagementStore", () => ({
  usePrinterManagementStore: (selector: (s: unknown) => unknown) =>
    selector({
      queueByPrinter: [],
      fetchQueueStatus: fetchQueueStatusMock,
      saveProfile: vi.fn(),
      retryFailedJob: vi.fn(),
      isSavingProfile: false,
      isLoadingQueue: false,
    }),
}));

vi.mock("@/stores/receiptDocumentStore", () => ({
  useReceiptDocumentStore: (selector: (s: unknown) => unknown) =>
    selector({
      historyRows: [],
      historyOutletId: 1,
      isLoadingHistory: false,
      error: null,
      setHistoryOutletId: vi.fn(),
      loadHistory: vi.fn(),
      openPreview: vi.fn(),
    }),
}));

vi.mock("@/stores/hardwareBridgeStore", () => ({
  useHardwareBridgeStore: (selector: (s: unknown) => unknown) =>
    selector(bridgeStoreState),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: {
    SETTINGS: "settings.view",
  },
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      user: {
        id: 1,
        name: "Owner",
        email: "owner@resto.local",
        permissions: ["settings.view", "settings.update"],
      },
    }),
}));

vi.mock("@/components/receipts/ReceiptPreviewModal", () => ({
  ReceiptPreviewModal: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PrinterSettings hardware bridge boundary", () => {
  beforeEach(() => {
    fetchQueueStatusMock.mockReset().mockResolvedValue(undefined);
    fetchBridgeSnapshotMock.mockReset().mockResolvedValue(undefined);
    startBridgeMonitoringMock.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal("confirm", vi.fn(() => true));
    bridgeStoreState.reconnectState = "stable";
    bridgeStoreState.runtimeState = "degraded";
  });

  it("renders bridge and device statuses from store data without direct API calls", async () => {
    render(<PrinterSettings />);

    expect(screen.getByText("Hardware Bridge Foundation")).toBeTruthy();
    expect(screen.getByText(/Bridge status/i)).toBeTruthy();
    expect(screen.getByText(/online/i)).toBeTruthy();
    expect(screen.getByText(/^Heartbeat:/i)).toBeTruthy();
    expect(screen.getAllByText(/healthy/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Runtime state:/i)).toBeTruthy();
    expect(screen.getAllByText(/degraded/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Spool depth:/i).textContent).toContain("7");
    expect(screen.getByText(/Dead-letter:/i).textContent).toContain("2");
    expect(screen.getByText(/Ack latency:/i).textContent).toContain("320");
    expect(screen.getByText(/Retry count:/i).textContent).toContain("5");
    expect(screen.getByText(/Executing:/i).textContent).toContain("1");
    expect(screen.getByText(/Retry pending:/i).textContent).toContain("3");
    expect(screen.getByText(/Acked:/i).textContent).toContain("14");
    expect(screen.getByText(/Capabilities:/i).textContent).toContain("print");
    expect(screen.getByText(/Provisioning:/i).textContent).toContain("paired");
    expect(screen.getByText(/Pair identity:/i).textContent).toContain("OUT-1");
    expect(screen.getByText(/Runtime version:/i).textContent).toContain("16.3.0");
    expect(screen.getByText(/Token health:/i).textContent).toContain("healthy");
    expect(screen.getByText(/Watchdog:/i).textContent).toContain("degraded");
    expect(screen.getByText(/Restarts\/crashes:/i).textContent).toContain("2/1");
    expect(screen.getByText(/Update availability:/i).textContent).toContain("16.3.1");
    expect(screen.getByText(/Deployment:/i).textContent).toContain("headless");
    expect(screen.getByText("Bridge Front")).toBeTruthy();
    expect(screen.getAllByText(/LAN/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Bluetooth/i)).toBeTruthy();

    await waitFor(() => {
      expect(fetchQueueStatusMock).toHaveBeenCalledTimes(1);
      expect(startBridgeMonitoringMock).toHaveBeenCalledWith(1, 5000);
    });
  });

  it("renders reconnect indicator from bridge runtime store state", () => {
    bridgeStoreState.reconnectState = "reconnecting";
    bridgeStoreState.runtimeState = "reconnecting";

    render(<PrinterSettings />);
    expect(screen.getByText(/Realtime reconnect in progress/i)).toBeTruthy();
    expect(screen.getByText(/polling fallback is still active/i)).toBeTruthy();
  });
});
