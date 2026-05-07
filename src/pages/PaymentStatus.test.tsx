// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentStatus from "./PaymentStatus";

const mockUsePaymentStore = vi.fn();
const mockPollTransactionStatus = vi.fn();
const mockRetryPayment = vi.fn();
let search = "transaction=tx-1001&provider=xendit";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(search)],
  };
});

vi.mock("@/stores/paymentStore", () => ({
  usePaymentStore: (selector: (state: Record<string, unknown>) => unknown) => mockUsePaymentStore(selector),
}));

describe("PaymentStatus page", () => {
  beforeEach(() => {
    search = "transaction=tx-1001&provider=xendit";
    mockPollTransactionStatus.mockReset();
    mockRetryPayment.mockReset();
    mockUsePaymentStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        currentTransaction: {
          id: "tx-1001",
          status: "pending",
          method: "qris",
          amount: 70000,
          checkoutUrl: "https://checkout.example/tx-1001",
          qrString: "0002010102122669...",
          deeplinkUrl: "gojek://pay/tx-1001",
          vaNumber: "1234567890",
        },
        isLoading: false,
        error: null,
        paymentStatus: "pending",
        expiresAt: new Date(Date.now() + 120000),
        checkoutUrl: "https://checkout.example/tx-1001",
        qrString: "0002010102122669...",
        deeplinkUrl: "gojek://pay/tx-1001",
        lastSyncAt: "2026-05-07T09:00:00.000Z",
        expiryCountdown: 120,
        pollTransactionStatus: mockPollTransactionStatus,
        retryPayment: mockRetryPayment,
        reconcileTransaction: vi.fn(),
        expireTransaction: vi.fn(),
        stopPolling: vi.fn(),
      }),
    );
  });

  it("renders qr checkout fields and preserves root hierarchy", () => {
    const { container } = render(<PaymentStatus />);
    expect(container.firstChild).toHaveClass("min-h-screen");
    expect(container.firstChild).toHaveClass("bg-background");
    expect(screen.getByText(/Payment Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Checkout URL/i)).toBeInTheDocument();
    expect(screen.getByText(/Open App/i)).toBeInTheDocument();
    expect(screen.getByText(/VA Number/i)).toBeInTheDocument();
    expect(screen.getByText(/Expires in:/i)).toBeInTheDocument();
  });

  it("starts polling from redirect transaction params", () => {
    render(<PaymentStatus />);

    expect(mockPollTransactionStatus).toHaveBeenCalledWith("tx-1001");
  });

  it("renders expired payment UX with retry flow", () => {
    mockUsePaymentStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        currentTransaction: {
          id: "tx-expired",
          status: "expired",
          method: "qris",
          amount: 70000,
        },
        isLoading: false,
        error: null,
        paymentStatus: "expired",
        checkoutUrl: "",
        qrString: "",
        deeplinkUrl: "",
        lastSyncAt: null,
        expiryCountdown: 0,
        pollTransactionStatus: mockPollTransactionStatus,
        retryPayment: mockRetryPayment,
        reconcileTransaction: vi.fn(),
        expireTransaction: vi.fn(),
        stopPolling: vi.fn(),
      }),
    );

    render(<PaymentStatus />);

    expect(screen.getByText(/Payment expired/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry payment/i })).toBeInTheDocument();
  });

  it("renders paid completion refresh state", () => {
    mockUsePaymentStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        currentTransaction: {
          id: "tx-paid",
          status: "paid",
          method: "qris",
          amount: 70000,
        },
        isLoading: false,
        error: null,
        paymentStatus: "paid",
        checkoutUrl: "",
        qrString: "",
        deeplinkUrl: "",
        lastSyncAt: "2026-05-07T09:05:00.000Z",
        expiryCountdown: 0,
        pollTransactionStatus: mockPollTransactionStatus,
        retryPayment: mockRetryPayment,
        reconcileTransaction: vi.fn(),
        expireTransaction: vi.fn(),
        stopPolling: vi.fn(),
      }),
    );

    render(<PaymentStatus />);

    expect(screen.getByText(/Payment completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Refreshing order status/i)).toBeInTheDocument();
  });
});
