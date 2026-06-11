// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Kitchen from "./Kitchen";

const mockToggleFullscreen = vi.fn();

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number }) => unknown) =>
    selector({ activeOutletId: 2 }),
}));

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (state: { outlets: { id: number; name: string }[] }) => unknown) =>
    selector({ outlets: [{ id: 2, name: "Demo Outlet" }] }),
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
    isFullscreen: false,
    toggleFullscreen: mockToggleFullscreen,
  }),
}));

vi.mock("@/stores/kitchenStore", () => ({
  useKitchenStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      tickets: [
        {
          id: "1",
          outletId: 2,
          orderId: "11",
          ticketNo: "KDS-1",
          status: "queued",
          queuedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
        },
      ],
      error: null,
      isLoading: false,
      isSubmitting: false,
      recoverySubmitting: false,
      lastTicketsUpdateSource: null,
      realtimeConnected: false,
      pollTimer: 1,
      consecutiveFetchFailures: 0,
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
      updateTicketStatus: vi.fn(),
      reportItemRecovery: vi.fn(),
    }),
}));

describe("KitchenFullscreenTest", () => {
  beforeEach(() => {
    mockToggleFullscreen.mockReset();
  });

  it("renders fullscreen toggle and delegates to hook", () => {
    render(<Kitchen />);
    const button = screen.getByTestId("kitchen-fullscreen-toggle");
    expect(button).toHaveTextContent("Fullscreen");
    fireEvent.click(button);
    expect(mockToggleFullscreen).toHaveBeenCalledTimes(1);
  });
});
