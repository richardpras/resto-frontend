// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QROrdersList from "./QROrdersList";

const mockStartPolling = vi.fn();
const mockStopPolling = vi.fn();
const mockConfirmRequest = vi.fn();
const mockRejectRequest = vi.fn();
const mockUseOutletStore = vi.fn();
const mockUseAuthStore = vi.fn();
const mockUseQrOrderStore = vi.fn();

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number }) => unknown) => mockUseOutletStore(selector),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: { QR_ORDERS: "qr_orders.view" },
  useAuthStore: (selector: (state: { hasPermission: (perm: string) => boolean }) => unknown) =>
    mockUseAuthStore(selector),
}));

vi.mock("@/stores/qrOrderStore", () => ({
  useQrOrderStore: (selector: (state: Record<string, unknown>) => unknown) => mockUseQrOrderStore(selector),
}));

vi.mock("@/lib/api-integration/qrOrderEndpoints", () => ({
  listQrOrdersWithMeta: vi.fn(),
  confirmQrOrder: vi.fn(),
  rejectQrOrder: vi.fn(),
}));

describe("QROrdersList store boundary", () => {
  beforeEach(() => {
    mockStartPolling.mockReset();
    mockStopPolling.mockReset();
    mockConfirmRequest.mockReset();
    mockRejectRequest.mockReset();
    mockUseOutletStore.mockImplementation((selector: (state: { activeOutletId: number }) => unknown) =>
      selector({ activeOutletId: 2 }),
    );
    mockUseAuthStore.mockImplementation((selector: (state: { hasPermission: (perm: string) => boolean }) => unknown) =>
      selector({ hasPermission: () => true }),
    );
    mockUseQrOrderStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        requests: [
          {
            id: "12",
            requestCode: "QRR-12",
            outletId: 2,
            tableId: 3,
            tableName: "T03",
            customerName: "Ana",
            status: "pending_cashier_confirmation",
            expiresAt: null,
            confirmedAt: null,
            rejectedAt: null,
            rejectionReason: "",
            orderId: null,
            items: [{ id: "1", menuItemId: 80, qty: 1, notes: "" }],
            createdAt: new Date("2026-05-07T08:00:00.000Z"),
          },
        ],
        isLoading: false,
        initialLoading: false,
        backgroundRefreshing: false,
        isSubmitting: false,
        error: null,
        lastSyncAt: null,
        startPolling: mockStartPolling,
        stopPolling: mockStopPolling,
        confirmRequest: mockConfirmRequest,
        rejectRequest: mockRejectRequest,
      }),
    );
  });

  it("delegates polling and actions to qrOrderStore", () => {
    const { container } = render(<QROrdersList />);
    expect(mockStartPolling).toHaveBeenCalledWith(
      { outletId: 2, status: "pending_cashier_confirmation", perPage: 100 },
      10000,
    );
    expect(container.firstChild).toHaveClass("p-4");

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(mockConfirmRequest).toHaveBeenCalledWith("12");

    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    expect(mockRejectRequest).toHaveBeenCalledWith("12", "Rejected by cashier");
  });
});
