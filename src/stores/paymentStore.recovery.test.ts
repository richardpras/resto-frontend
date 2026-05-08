import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePaymentStore } from "./paymentStore";

const mockCreatePaymentTransaction = vi.fn();
const mockGetPaymentTransaction = vi.fn();

vi.mock("@/lib/api-integration/paymentEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/paymentEndpoints")>(
    "@/lib/api-integration/paymentEndpoints",
  );
  return {
    ...actual,
    createPaymentTransaction: (...args: unknown[]) => mockCreatePaymentTransaction(...args),
    getPaymentTransaction: (...args: unknown[]) => mockGetPaymentTransaction(...args),
  };
});

function tx(status: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    order_id: "o-1",
    outlet_id: 2,
    method: "qris",
    amount: 50000,
    status,
    checkoutUrl: "https://checkout.example/tx-1",
    qrString: "000201010212",
    deeplinkUrl: "gojek://pay/tx-1",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    providerMetadataSnapshot: { provider: "xendit" },
    ...overrides,
  };
}

function resetState() {
  usePaymentStore.getState().stopPolling();
  usePaymentStore.setState({
    isLoading: false,
    isSubmitting: false,
    error: null,
    paymentStatus: null,
    expiresAt: null,
    checkoutUrl: "",
    qrString: "",
    deeplinkUrl: "",
    lastSyncAt: null,
    currentTransaction: null,
    pollingActive: false,
    expiryCountdown: 0,
    pollingTimer: null,
    expiryTimer: null,
    activeRequestId: 0,
    activeAbortController: null,
    lastRequestMeta: null,
  });
}

describe("paymentStore recovery behavior", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockCreatePaymentTransaction.mockReset();
    mockGetPaymentTransaction.mockReset();
    resetState();
  });

  it("restarting polling does not duplicate refresh loop state", async () => {
    vi.useFakeTimers();
    mockGetPaymentTransaction.mockResolvedValue(tx("pending"));

    usePaymentStore.getState().pollTransactionStatus("tx-1", 1000);
    const firstTimer = usePaymentStore.getState().pollingTimer;
    usePaymentStore.getState().pollTransactionStatus("tx-1", 1000);
    const secondTimer = usePaymentStore.getState().pollingTimer;

    expect(firstTimer).not.toBeNull();
    expect(secondTimer).not.toBeNull();
    expect(firstTimer).not.toBe(secondTimer);

    await vi.advanceTimersByTimeAsync(2100);
    // 2 immediate calls (each start) + 2 ticks from the latest timer.
    expect(mockGetPaymentTransaction).toHaveBeenCalledTimes(4);
    usePaymentStore.getState().stopPolling();
  });

  it("retry flow replaces current transaction instead of duplicating state", async () => {
    usePaymentStore.setState({
      currentTransaction: {
        id: "tx-old",
        orderId: "o-1",
        outletId: 2,
        method: "qris",
        amount: 50000,
        status: "failed",
        checkoutUrl: "",
        qrString: "",
        deeplinkUrl: "",
        vaNumber: "",
        expiresAt: null,
        expiryTime: null,
        paidAt: null,
        createdAt: null,
        updatedAt: null,
        providerMetadataSnapshot: null,
        payloadSnapshot: null,
      },
    });

    mockCreatePaymentTransaction.mockResolvedValue(tx("pending", { id: "tx-new" }));
    mockGetPaymentTransaction.mockResolvedValue(tx("pending", { id: "tx-new" }));

    await usePaymentStore.getState().retryPayment();

    const state = usePaymentStore.getState();
    expect(state.currentTransaction?.id).toBe("tx-new");
    expect(state.paymentStatus).toBe("pending");
    expect(mockCreatePaymentTransaction).toHaveBeenCalledTimes(1);
  });
});
