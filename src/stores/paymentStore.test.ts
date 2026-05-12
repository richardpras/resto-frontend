import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePaymentStore } from "./paymentStore";

const mockCreatePaymentTransaction = vi.fn();
const mockGetPaymentTransaction = vi.fn();
const mockExpirePaymentTransaction = vi.fn();
const mockReconcilePaymentTransaction = vi.fn();
const mockSimulateViaXenditProvider = vi.fn();

vi.mock("@/lib/api-integration/paymentEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/paymentEndpoints")>(
    "@/lib/api-integration/paymentEndpoints",
  );
  return {
    ...actual,
    createPaymentTransaction: (...args: unknown[]) => mockCreatePaymentTransaction(...args),
    getPaymentTransaction: (...args: unknown[]) => mockGetPaymentTransaction(...args),
    expirePaymentTransaction: (...args: unknown[]) => mockExpirePaymentTransaction(...args),
    reconcilePaymentTransaction: (...args: unknown[]) => mockReconcilePaymentTransaction(...args),
    simulateViaXenditProvider: (...args: unknown[]) => mockSimulateViaXenditProvider(...args),
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
    va_number: "1234567890",
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
  });
}

describe("paymentStore", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockCreatePaymentTransaction.mockReset();
    mockGetPaymentTransaction.mockReset();
    mockExpirePaymentTransaction.mockReset();
    mockReconcilePaymentTransaction.mockReset();
    mockSimulateViaXenditProvider.mockReset();
    resetState();
  });

  it("creates hosted checkout state from provider-aware payload", async () => {
    mockCreatePaymentTransaction.mockResolvedValue(tx("pending"));

    const created = await usePaymentStore.getState().createPaymentTransaction({
      orderId: "o-1",
      outletId: 2,
      method: "qris",
      amount: 50000,
      provider: "xendit",
    });

    expect(mockCreatePaymentTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "o-1",
        outletId: 2,
        method: "qris",
        amount: 50000,
        provider: "xendit",
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(created.checkoutUrl).toBe("https://checkout.example/tx-1");
    expect(usePaymentStore.getState()).toMatchObject({
      paymentStatus: "pending",
      checkoutUrl: "https://checkout.example/tx-1",
      qrString: "000201010212",
      deeplinkUrl: "gojek://pay/tx-1",
    });
    expect(usePaymentStore.getState().expiresAt).toBeInstanceOf(Date);
    expect(usePaymentStore.getState().lastSyncAt).toEqual(expect.any(String));
  });

  it("runs polling lifecycle and stops on paid", async () => {
    vi.useFakeTimers();
    mockGetPaymentTransaction
      .mockResolvedValueOnce(tx("pending"))
      .mockResolvedValueOnce(tx("pending"))
      .mockResolvedValueOnce(tx("paid", { paid_at: new Date().toISOString() }));

    usePaymentStore.getState().pollTransactionStatus("tx-1", 1000);
    await vi.runOnlyPendingTimersAsync();
    expect(mockGetPaymentTransaction).toHaveBeenCalled();
    expect(usePaymentStore.getState().currentTransaction?.status).toBe("pending");

    await vi.advanceTimersByTimeAsync(1000);
    expect(usePaymentStore.getState().currentTransaction?.status).toBe("paid");
    expect(usePaymentStore.getState().pollingActive).toBe(false);
  });

  it("retries failed payment and restarts polling", async () => {
    vi.useFakeTimers();
    usePaymentStore.setState({
      currentTransaction: {
        id: "tx-1",
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
    mockCreatePaymentTransaction.mockResolvedValue(tx("pending", { id: "tx-2" }));
    mockGetPaymentTransaction.mockResolvedValue(tx("pending", { id: "tx-2" }));

    await usePaymentStore.getState().retryPayment();
    expect(mockCreatePaymentTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "o-1",
        outletId: 2,
        method: "qris",
        amount: 50000,
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(usePaymentStore.getState().currentTransaction?.id).toBe("tx-2");
    expect(usePaymentStore.getState().pollingActive).toBe(true);
  });

  it("ignores stale polling responses after a newer transaction starts", async () => {
    let resolveOld!: (value: unknown) => void;
    mockGetPaymentTransaction.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveOld = resolve;
      }),
    );

    usePaymentStore.getState().pollTransactionStatus("tx-old", 1000);
    usePaymentStore.getState().stopPolling();
    usePaymentStore.setState({ currentTransaction: null });

    mockCreatePaymentTransaction.mockResolvedValue(tx("pending", { id: "tx-new" }));
    await usePaymentStore.getState().createPaymentTransaction({
      orderId: "o-1",
      outletId: 2,
      method: "qris",
      amount: 50000,
    });

    resolveOld(tx("paid", { id: "tx-old" }));
    await Promise.resolve();

    expect(usePaymentStore.getState().currentTransaction?.id).toBe("tx-new");
  });

  it("simulate via provider triggers reconcile fallback without optimistic paid", async () => {
    usePaymentStore.setState({
      currentTransaction: {
        id: "tx-1",
        orderId: "o-1",
        outletId: 2,
        method: "qris",
        amount: 50000,
        status: "pending",
        checkoutUrl: "",
        qrString: "000201010212",
        deeplinkUrl: "",
        vaNumber: "",
        expiresAt: null,
        expiryTime: null,
        paidAt: null,
        createdAt: null,
        updatedAt: null,
        providerMetadataSnapshot: { provider: "xendit" },
        payloadSnapshot: null,
      },
    });
    mockSimulateViaXenditProvider.mockResolvedValue(tx("pending"));
    mockReconcilePaymentTransaction.mockResolvedValue(tx("paid", { paid_at: new Date().toISOString() }));

    const updated = await usePaymentStore.getState().simulateViaProvider("tx-1");

    expect(mockSimulateViaXenditProvider).toHaveBeenCalledWith(
      "tx-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockReconcilePaymentTransaction).toHaveBeenCalledWith(
      "tx-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(updated.status).toBe("paid");
    expect(usePaymentStore.getState().currentTransaction?.status).toBe("paid");
  });
});
