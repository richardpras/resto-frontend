// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QROrdersList from "./QROrdersList";

const mockNavigate = vi.fn();
const mockOpenQrOrderInPosFlow = vi.fn().mockResolvedValue(undefined);

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/components/qr-order/openQrOrderInPosFlow", () => ({
  openQrOrderInPosFlow: (...args: unknown[]) => mockOpenQrOrderInPosFlow(...args),
}));

vi.mock("@/stores/qrOrderPosBridgeStore", () => ({
  useQrOrderPosBridgeStore: (selector: (state: { setFromOpenInPos: () => void }) => unknown) =>
    selector({ setFromOpenInPos: vi.fn() }),
}));

const mockStartPolling = vi.fn();
const mockStopPolling = vi.fn();
const mockFetchRequests = vi.fn();
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

vi.mock("@/lib/api-integration/qrOrderReviewEndpoints", () => ({
  searchQrOrder: vi.fn(),
  fetchQrOrderReview: vi.fn(),
  fetchQrOrderHistory: vi.fn().mockResolvedValue([]),
  adjustQrOrder: vi.fn(),
  confirmQrOrderAndPay: vi.fn(),
}));

vi.mock("@/lib/api-integration/qrOrderEndpoints", () => ({
  listQrOrdersWithMeta: vi.fn().mockResolvedValue({
    requests: [],
    meta: { currentPage: 1, perPage: 50, total: 0, lastPage: 1 },
  }),
}));

vi.mock("@/components/qr-order/QrOrderScannerModal", () => ({
  QrOrderScannerModal: () => null,
}));

vi.mock("@/components/qr-order/QrOrderPreviewDrawer", () => ({
  QrOrderPreviewDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="qr-preview-drawer-open">Preview Drawer</div> : null,
}));

describe("QROrdersList store boundary", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockOpenQrOrderInPosFlow.mockClear();
    mockStartPolling.mockReset();
    mockStopPolling.mockReset();
    mockFetchRequests.mockReset();
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
            decisionMode: null,
            statusLabel: "Pending",
            estimatedTotal: 12000,
            cashierCalledAt: null,
            cashierCallCount: 0,
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
        fetchRequests: mockFetchRequests,
      }),
    );
  });

  it("delegates polling and opens preview drawer from pending card", () => {
    const { container } = render(<QROrdersList />);
    expect(mockStartPolling).toHaveBeenCalledWith(
      { outletId: 2, status: "pending_cashier_confirmation", perPage: 25, page: 1 },
      10000,
    );
    expect(container.firstChild).toHaveClass("p-4");

    fireEvent.click(screen.getByTestId("qr-order-preview-button"));
    expect(screen.getByTestId("qr-preview-drawer-open")).toBeInTheDocument();
  });

  it("opens POS directly from list without preview drawer", async () => {
    render(<QROrdersList />);

    fireEvent.click(screen.getByTestId("qr-order-open-pos-list-button"));

    await waitFor(() => {
      expect(mockOpenQrOrderInPosFlow).toHaveBeenCalledWith(
        "12",
        expect.objectContaining({ navigate: mockNavigate }),
      );
    });
    expect(screen.queryByTestId("qr-preview-drawer-open")).not.toBeInTheDocument();
  });
});
