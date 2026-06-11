// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PrinterSettings from "./PrinterSettings";

const fetchQueueStatusMock = vi.fn();
const listProductionStationsMock = vi.fn();
const listPrinterRoutesMock = vi.fn();
const assignPrinterRouteMock = vi.fn();

vi.mock("@/stores/printerManagementStore", () => ({
  usePrinterManagementStore: (selector: (state: Record<string, unknown>) => unknown) =>
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
  useReceiptDocumentStore: (selector: (state: Record<string, unknown>) => unknown) =>
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
  useHardwareBridgeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      bridgeStatus: "offline",
      heartbeatState: "stale",
      reconnectState: "stable",
      devices: [],
      initialLoading: false,
      backgroundRefreshing: false,
      error: null,
      startMonitoring: vi.fn(),
      stopMonitoring: vi.fn(),
      realtimeState: "idle",
      realtimeTransport: "polling",
      runtimeState: "offline",
      runtimeCapabilities: { transports: [], capabilities: [], spoolSupported: false },
      spoolHealth: { queueDepth: 0, deadLetterCount: 0, avgAckLatencyMs: 0, retryCount: 0 },
      executionLifecycle: { executing: 0, retryPending: 0, acknowledged: 0 },
      provisioning: { status: "unpaired", pairedOutletIdentity: null, pairedDeviceIdentity: null, tokenHealth: "unknown" },
      watchdog: { state: "healthy", restartCount: 0, crashCount: 0 },
      runtime: { version: "0", deploymentMode: "local", serviceMode: "foreground", updateAvailable: false },
    }),
}));

vi.mock("@/lib/api-integration/productionStationEndpoints", () => ({
  listProductionStations: (...args: unknown[]) => listProductionStationsMock(...args),
}));

vi.mock("@/lib/api-integration/printerRouteEndpoints", () => ({
  listPrinterRoutes: (...args: unknown[]) => listPrinterRoutesMock(...args),
  assignPrinterRoute: (...args: unknown[]) => assignPrinterRouteMock(...args),
}));

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      printers: [
        { id: "10", name: "Kitchen Printer", printerType: "kitchen", connection: "lan", ip: "10.0.0.2", outletId: 1 },
        { id: "11", name: "Bar Printer", printerType: "kitchen", connection: "lan", ip: "10.0.0.3", outletId: 1 },
      ],
      outlets: [{ id: 1, code: "OUT-1", name: "Outlet 1", address: "", phone: "", manager: "", status: "active" }],
      upsertPrinter: vi.fn(),
      ensureSectionsLoaded: vi.fn(),
    }),
  newId: () => "new-id",
  removePrinterCascade: vi.fn(),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      user: { permissions: ["settings.manage", "settings.update", "settings.view"] },
      hasPermission: () => true,
    }),
  PERMISSIONS: { KITCHEN: "kitchen.use" },
}));

describe("PrinterStationRouteSettings", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    fetchQueueStatusMock.mockResolvedValue(undefined);
    listProductionStationsMock.mockResolvedValue([
      { id: 1, outletId: 1, code: "kitchen", name: "Kitchen", type: "kitchen", displayOrder: 1, isActive: true, kdsEnabled: true, printEnabled: true },
      { id: 2, outletId: 1, code: "bar", name: "Bar", type: "bar", displayOrder: 2, isActive: true, kdsEnabled: true, printEnabled: true },
    ]);
    listPrinterRoutesMock.mockResolvedValue([]);
    assignPrinterRouteMock.mockResolvedValue({ id: 99 });
  });

  it("shows production station mapping panel", async () => {
    render(<PrinterSettings />);
    await waitFor(() => {
      expect(screen.getByTestId("printer-station-route-panel")).toBeInTheDocument();
    });
    expect(screen.getByTestId("printer-station-row-kitchen")).toBeInTheDocument();
    expect(screen.getByTestId("printer-station-row-bar")).toBeInTheDocument();
  });

  it("assigns route when user selects printer profile and saves", async () => {
    listPrinterRoutesMock.mockResolvedValue([
      {
        id: 5,
        outletId: 1,
        printerProfileId: 10,
        printType: "kitchen",
        routeScope: "production_station",
        productionStationId: 1,
        productionStation: { id: 1, code: "kitchen", name: "Kitchen" },
        priority: 10,
        isActive: true,
      },
    ]);

    render(<PrinterSettings />);
    await waitFor(() => screen.getByTestId("printer-station-row-kitchen"));

    fireEvent.click(screen.getByTestId("printer-station-row-kitchen").querySelector("button")!);

    await waitFor(() => {
      expect(assignPrinterRouteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          outletId: 1,
          printerProfileId: 10,
          productionStationId: 1,
          printType: "kitchen",
        }),
      );
    });
  });
});
