// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QROrder from "./QROrder";

const mockUseQrOrderStore = vi.fn();
const mockUsePaymentStore = vi.fn();
const mockResetAsync = vi.fn();

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

describe("QROrder production flow guards", () => {
  beforeEach(() => {
    mockResetAsync.mockReset();
    mockUseQrOrderStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        createRequest: vi.fn(),
        isSubmitting: false,
      }),
    );
    mockUsePaymentStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        currentTransaction: null,
        expiryCountdown: 0,
        createPaymentTransaction: vi.fn(),
        pollTransactionStatus: vi.fn(),
        retryPayment: vi.fn(),
        resetAsync: mockResetAsync,
      }),
    );
  });

  it("cleans payment async state when the page unmounts", () => {
    const { unmount } = render(<QROrder />);
    unmount();
    expect(mockResetAsync).toHaveBeenCalledTimes(1);
  });
});
