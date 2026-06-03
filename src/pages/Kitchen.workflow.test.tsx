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

vi.mock("@/hooks/useKitchenTicketSounds", () => ({
  useKitchenTicketSounds: vi.fn(),
}));

vi.mock("@/hooks/useKitchenFullscreen", () => ({
  useKitchenFullscreen: () => ({ isFullscreen: false, toggleFullscreen: vi.fn() }),
}));

const tickets = [
  {
    id: "1",
    outletId: 2,
    orderId: "11",
    orderNumber: "ORD-1023",
    tableNumber: "5",
    serviceMode: "dine_in",
    ticketNo: "KDS-0012",
    status: "queued" as const,
    queuedAt: new Date("2026-06-03T10:00:00.000Z"),
    createdAt: new Date("2026-06-03T10:00:00.000Z"),
    updatedAt: new Date("2026-06-03T10:00:00.000Z"),
    items: [{ id: "i1", orderItemId: "oi1", name: "Nasi Goreng", qty: 2, notes: "", status: "queued" }],
  },
  {
    id: "2",
    outletId: 2,
    orderId: "12",
    ticketNo: "KDS-0013",
    status: "in_progress" as const,
    queuedAt: new Date("2026-06-03T09:00:00.000Z"),
    createdAt: new Date("2026-06-03T09:00:00.000Z"),
    updatedAt: new Date("2026-06-03T09:30:00.000Z"),
    items: [{ id: "i2", orderItemId: "oi2", name: "Es Teh", qty: 1, notes: "", status: "in_progress" }],
  },
];

vi.mock("@/stores/kitchenStore", () => ({
  useKitchenStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      tickets,
      error: null,
      isLoading: false,
      isSubmitting: false,
      recoverySubmitting: false,
      lastTicketsUpdateSource: "fetch",
      realtimeConnected: true,
      pollTimer: 1,
      consecutiveFetchFailures: 0,
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
      updateTicketStatus: mockUpdateTicketStatus,
      reportItemRecovery: vi.fn(),
    }),
}));

describe("Kitchen workflow board", () => {
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

  it("renders three workflow columns and places tickets by status", () => {
    render(<Kitchen />);
    expect(screen.getByTestId("kitchen-workflow-board")).toBeInTheDocument();
    expect(screen.getByTestId("kitchen-column-new")).toBeInTheDocument();
    expect(screen.getByTestId("kitchen-column-cooking")).toBeInTheDocument();
    expect(screen.getByTestId("kitchen-column-ready")).toBeInTheDocument();

    const newColumn = screen.getByTestId("kitchen-column-new");
    const cookingColumn = screen.getByTestId("kitchen-column-cooking");
    expect(newColumn.querySelector('[data-ticket-id="1"]')).toBeTruthy();
    expect(cookingColumn.querySelector('[data-ticket-id="2"]')).toBeTruthy();
    expect(screen.getByText(/Ticket KDS-0012/)).toBeInTheDocument();
    expect(screen.getByText(/ORD-1023/)).toBeInTheDocument();
    expect(screen.getByText(/Table 5/)).toBeInTheDocument();
  });

  it("uses column-specific primary actions", () => {
    render(<Kitchen />);
    fireEvent.click(screen.getByRole("button", { name: "Start Cooking" }));
    expect(mockUpdateTicketStatus).toHaveBeenCalledWith("1", "in_progress");
  });
});
