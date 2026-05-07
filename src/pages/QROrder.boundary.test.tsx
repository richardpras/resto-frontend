// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QROrder from "./QROrder";

const mockCreateRequest = vi.fn();
const mockUseQrOrderStore = vi.fn();
const mockUsePaymentStore = vi.fn();
const mockCreatePaymentTransaction = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams("outletId=2&tableId=7&tableName=T07")],
  };
});

vi.mock("@/stores/qrOrderStore", () => ({
  useQrOrderStore: (selector: (state: Record<string, unknown>) => unknown) => mockUseQrOrderStore(selector),
}));

vi.mock("@/stores/paymentStore", () => ({
  usePaymentStore: (selector: (state: Record<string, unknown>) => unknown) => mockUsePaymentStore(selector),
}));

const mockPaymentEndpointCreate = vi.fn();
vi.mock("@/lib/api-integration/paymentEndpoints", () => ({
  createPaymentTransaction: (...args: unknown[]) => mockPaymentEndpointCreate(...args),
}));

describe("QROrder page store boundary", () => {
  beforeEach(() => {
    mockCreateRequest.mockReset();
    mockCreatePaymentTransaction.mockReset();
    mockPaymentEndpointCreate.mockReset();
    mockUseQrOrderStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        createRequest: mockCreateRequest,
        isSubmitting: false,
      }),
    );
    mockUsePaymentStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        currentTransaction: null,
        expiryCountdown: 0,
        createPaymentTransaction: mockCreatePaymentTransaction,
        pollTransactionStatus: vi.fn(),
        retryPayment: vi.fn(),
      }),
    );
  });

  it("uses store state/actions only and keeps root layout", () => {
    const { container } = render(<QROrder />);
    expect(screen.getByText(/RestoHub Menu/i)).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("min-h-screen");
    expect(container.firstChild).toHaveClass("bg-background");
  });

  it("uses payment store action for online checkout", async () => {
    mockCreateRequest.mockResolvedValue({ id: "req-1", requestCode: "QRR-001" });
    mockCreatePaymentTransaction.mockResolvedValue({ id: "tx-1" });
    render(<QROrder />);

    fireEvent.click(screen.getByRole("button", { name: /nasi goreng special/i }));
    fireEvent.click(screen.getByRole("button", { name: /view cart/i }));
    fireEvent.click(screen.getByRole("button", { name: /checkout/i }));
    fireEvent.click(screen.getByRole("button", { name: /pay online/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit order/i }));

    await waitFor(() => {
      expect(mockCreatePaymentTransaction).toHaveBeenCalled();
    });
    expect(mockPaymentEndpointCreate).not.toHaveBeenCalled();
  });
});
