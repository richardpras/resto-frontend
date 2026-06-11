// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Kitchen from "@/pages/Kitchen";

const mockStartPolling = vi.fn();
const mockStopPolling = vi.fn();

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
  useKitchenFullscreen: () => ({ isFullscreen: false, toggleFullscreen: vi.fn() }),
}));

vi.mock("@/hooks/useKdsFocusMode", () => ({
  useKdsFocusMode: () => ({ focusMode: "comfortable", setFocusMode: vi.fn() }),
}));

vi.mock("@/stores/kitchenStore", () => ({
  useKitchenStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      tickets: [
        {
          id: "legacy",
          outletId: 2,
          orderId: "11",
          orderNumber: "ORD-LEGACY",
          ticketNo: "KDS-LEGACY",
          status: "queued",
          station: null,
          queuedAt: new Date("2026-06-03T10:00:00.000Z"),
          createdAt: new Date("2026-06-03T10:00:00.000Z"),
          updatedAt: new Date("2026-06-03T10:00:00.000Z"),
          items: [
            {
              id: "i-legacy",
              orderItemId: "oi-legacy",
              name: "Legacy Item",
              qty: 1,
              notes: "",
              status: "queued",
            },
          ],
        },
        {
          id: "1",
          outletId: 2,
          orderId: "12",
          orderNumber: "ORD-1002",
          ticketNo: "KDS-1-kitchen",
          status: "queued",
          station: { id: 1, code: "kitchen", name: "Kitchen" },
          queuedAt: new Date("2026-06-03T10:00:00.000Z"),
          createdAt: new Date("2026-06-03T10:00:00.000Z"),
          updatedAt: new Date("2026-06-03T10:00:00.000Z"),
          items: [
            {
              id: "i1",
              orderItemId: "oi1",
              name: "Nasi Goreng",
              qty: 1,
              notes: "",
              status: "queued",
            },
          ],
        },
        {
          id: "2",
          outletId: 2,
          orderId: "13",
          orderNumber: "ORD-1003",
          ticketNo: "KDS-2-bar",
          status: "queued",
          station: { id: 2, code: "bar", name: "Bar" },
          queuedAt: new Date("2026-06-03T10:00:00.000Z"),
          createdAt: new Date("2026-06-03T10:00:00.000Z"),
          updatedAt: new Date("2026-06-03T10:00:00.000Z"),
          items: [
            {
              id: "i2",
              orderItemId: "oi2",
              name: "Es Teh",
              qty: 1,
              notes: "",
              status: "queued",
            },
          ],
        },
      ],
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

describe("KdsStationLegacyTicket", () => {
  beforeEach(() => {
    mockStartPolling.mockReset();
    mockStopPolling.mockReset();
    localStorage.clear();
  });

  it("shows legacy null-station ticket in all view without crashing", () => {
    render(<Kitchen />);

    expect(screen.getByText("#ORD-LEGACY")).toBeInTheDocument();
    expect(screen.getByText("Legacy Item")).toBeInTheDocument();
    expect(screen.getAllByTestId("kds-ticket-station-badge")).toHaveLength(2);
  });
});
