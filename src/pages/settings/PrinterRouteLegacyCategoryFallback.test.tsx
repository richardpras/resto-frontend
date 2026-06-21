// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PrinterSettings from "./PrinterSettings";

vi.mock("@/stores/printerManagementStore", () => ({
  usePrinterManagementStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      queueByPrinter: [],
      fetchQueueStatus: vi.fn(),
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

vi.mock("@/lib/api-integration/endpoints", () => ({
  listMenuCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "Food", nameEn: "Food", nameId: "Makanan", sortOrder: 10, isActive: true },
  ]),
  listMenuCategoryPrinterMappings: vi.fn().mockResolvedValue([]),
  saveMenuCategoryPrinterMapping: vi.fn(),
  deleteMenuCategoryPrinterMapping: vi.fn(),
}));

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      printers: [{ id: "10", name: "Kitchen Printer", printerType: "kitchen", connection: "lan", ip: "10.0.0.2", outletId: 1, printerProfileId: 10 }],
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

describe("PrinterRouteLegacyCategoryFallback", () => {
  it("does not show category routing panel in printer settings", () => {
    render(<PrinterSettings />);
    expect(screen.queryByTestId("menu-category-unmapped-banner")).not.toBeInTheDocument();
    expect(screen.queryByText(/category routing/i)).not.toBeInTheDocument();
  });

  it("does not show legacy category routing in printer dialog", () => {
    render(<PrinterSettings />);
    fireEvent.click(screen.getByRole("button", { name: /add printer/i }));
    expect(screen.queryByTestId("printer-legacy-category-routing")).not.toBeInTheDocument();
    expect(screen.queryByText(/legacy category routing/i)).not.toBeInTheDocument();
  });

  it("renders existing printer profile table without crash when stations are absent", async () => {
    render(<PrinterSettings />);
    expect(screen.getByText("Kitchen Printer")).toBeInTheDocument();
    expect(screen.getByText("Printer Setup")).toBeInTheDocument();
  });
});
