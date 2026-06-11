// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Kitchen from "@/pages/Kitchen";

const mockStartPolling = vi.fn();
const mockStopPolling = vi.fn();
const mockToggleFullscreen = vi.fn();

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number }) => unknown) =>
    selector({ activeOutletId: 2 }),
}));

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (state: { outlets: { id: number; name: string }[] }) => unknown) =>
    selector({ outlets: [{ id: 2, name: "Sunset Cafe" }] }),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: { KITCHEN: "kitchen.use" },
  useAuthStore: (selector: (state: { hasPermission: (perm: string) => boolean }) => unknown) =>
    selector({ hasPermission: () => true }),
}));

vi.mock("@/hooks/useKitchenTicketSounds", () => ({
  useKitchenTicketSounds: vi.fn(),
}));

vi.mock("@/hooks/useKitchenFullscreen", () => ({
  useKitchenFullscreen: () => ({
    isFullscreen: true,
    toggleFullscreen: mockToggleFullscreen,
  }),
}));

vi.mock("@/hooks/useKdsFocusMode", () => ({
  useKdsFocusMode: () => ({ focusMode: "comfortable", setFocusMode: vi.fn() }),
}));

function stationTicket(id: string, code: string, name: string) {
  return {
    id,
    outletId: 2,
    orderId: String(100 + Number(id)),
    ticketNo: `KDS-2-${id}-${code}`,
    status: "queued" as const,
    station: { id: Number(id), code, name },
    queuedAt: new Date("2026-06-03T10:00:00.000Z"),
    createdAt: new Date("2026-06-03T10:00:00.000Z"),
    updatedAt: new Date("2026-06-03T10:00:00.000Z"),
    items: [
      {
        id: `i-${id}`,
        orderItemId: `oi-${id}`,
        name: code === "kitchen" ? "Nasi Goreng" : "Es Teh",
        qty: 1,
        notes: "",
        status: "queued",
      },
    ],
  };
}

vi.mock("@/stores/kitchenStore", () => ({
  useKitchenStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      tickets: [stationTicket("1", "kitchen", "Kitchen"), stationTicket("2", "bar", "Bar")],
      error: null,
      isLoading: false,
      isSubmitting: false,
      recoverySubmitting: false,
      lastTicketsUpdateSource: null,
      realtimeConnected: true,
      pollTimer: 1,
      consecutiveFetchFailures: 0,
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
      updateTicketStatus: vi.fn(),
      reportItemRecovery: vi.fn(),
    }),
}));

describe("KdsStationApiFilter", () => {
  beforeEach(() => {
    mockStartPolling.mockReset();
    mockStopPolling.mockReset();
    mockToggleFullscreen.mockReset();
    localStorage.clear();
  });

  it("starts polling without station filter in all view", () => {
    render(<Kitchen />);
    expect(mockStartPolling).toHaveBeenCalledWith({ outletId: 2, perPage: 200 });
  });

  it("requests stationCode=bar when bar is selected", async () => {
    render(<Kitchen />);
    fireEvent.click(screen.getByTestId("kds-station-bar"));

    await waitFor(() => {
      expect(mockStartPolling).toHaveBeenCalledWith({
        outletId: 2,
        perPage: 200,
        stationCode: "bar",
      });
    });
  });

  it("hides station badges in station-specific view", async () => {
    render(<Kitchen />);
    fireEvent.click(screen.getByTestId("kds-station-bar"));

    await waitFor(() => {
      expect(screen.queryByTestId("kds-ticket-station-badge")).not.toBeInTheDocument();
    });
  });

  it("keeps fullscreen toggle available with station filter active", async () => {
    render(<Kitchen />);

    expect(screen.getByTestId("kitchen-display-root")).toHaveAttribute("data-kds-fullscreen", "true");
    expect(screen.getByTestId("kds-station-selector")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("kds-station-kitchen"));
    fireEvent.click(screen.getByTestId("kitchen-fullscreen-toggle"));

    await waitFor(() => {
      expect(mockToggleFullscreen).toHaveBeenCalledTimes(1);
    });
  });
});
