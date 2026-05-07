// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Kitchen from "./Kitchen";

const mockStartPolling = vi.fn();
const mockStopPolling = vi.fn();
const mockUpdateTicketStatus = vi.fn();
const mockUseOutletStore = vi.fn();
const mockUseAuthStore = vi.fn();

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number }) => unknown) =>
    mockUseOutletStore(selector),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: { KITCHEN: "kitchen.use" },
  useAuthStore: (selector: (state: { hasPermission: (perm: string) => boolean }) => unknown) =>
    mockUseAuthStore(selector),
}));

vi.mock("@/stores/kitchenStore", () => ({
  useKitchenStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      tickets: [
        {
          id: "1",
          outletId: 2,
          orderId: "11",
          ticketNo: "KT-001",
          status: "queued",
          queuedAt: new Date("2026-05-07T07:00:00.000Z"),
          createdAt: new Date("2026-05-07T07:00:00.000Z"),
          updatedAt: new Date("2026-05-07T07:00:00.000Z"),
          items: [{ id: "i1", orderItemId: "oi1", name: "Nasi Goreng", qty: 1, notes: "", status: "queued" }],
        },
      ],
      error: null,
      isLoading: false,
      isSubmitting: false,
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
      updateTicketStatus: mockUpdateTicketStatus,
    }),
}));

vi.mock("@/lib/api-integration/kitchenEndpoints", () => ({
  listKitchenTickets: vi.fn(),
  updateKitchenTicketStatus: vi.fn(),
}));

describe("Kitchen page store boundary", () => {
  beforeEach(() => {
    mockStartPolling.mockReset();
    mockStopPolling.mockReset();
    mockUpdateTicketStatus.mockReset();
    mockUseOutletStore.mockImplementation(
      (selector: (state: { activeOutletId: number }) => unknown) => selector({ activeOutletId: 2 }),
    );
    mockUseAuthStore.mockImplementation(
      (selector: (state: { hasPermission: (perm: string) => boolean }) => unknown) =>
        selector({ hasPermission: () => true }),
    );
  });

  it("remains presentation-oriented and delegates actions to kitchenStore", () => {
    render(<Kitchen />);
    expect(mockStartPolling).toHaveBeenCalledWith({ outletId: 2, perPage: 200 });

    fireEvent.click(screen.getByRole("button", { name: /mark as cooking/i }));
    expect(mockUpdateTicketStatus).toHaveBeenCalledWith("1", "in_progress");
  });
});
