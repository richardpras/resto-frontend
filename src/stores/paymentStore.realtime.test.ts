import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPaymentTransaction = vi.fn();
const mockAdapterConnect = vi.fn();
const mockAdapterSubscribe = vi.fn();
const mockAdapterOnConnectionStateChange = vi.fn();
let realtimeHandler: ((event: Record<string, unknown>) => void) | null = null;

vi.mock("@/lib/api-integration/paymentEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/paymentEndpoints")>(
    "@/lib/api-integration/paymentEndpoints",
  );
  return {
    ...actual,
    getPaymentTransaction: (...args: unknown[]) => mockGetPaymentTransaction(...args),
  };
});

vi.mock("@/domain/realtimeAdapter", () => ({
  getRealtimeAdapter: () => ({
    connect: () => mockAdapterConnect(),
    subscribe: (args: { onEvent: (event: Record<string, unknown>) => void }) => {
      realtimeHandler = args.onEvent;
      mockAdapterSubscribe(args);
      return () => {
        realtimeHandler = null;
      };
    },
    onConnectionStateChange: (listener: (state: "connected" | "disconnected") => void) => {
      listener("disconnected");
      mockAdapterOnConnectionStateChange(listener);
      return () => undefined;
    },
  }),
}));

import { usePaymentStore } from "./paymentStore";

function apiTx(status: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    order_id: "o-1",
    outlet_id: 1,
    method: "qris",
    amount: 10000,
    status,
    checkoutUrl: "",
    qrString: "",
    deeplinkUrl: "",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
}

describe("paymentStore realtime fallback behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetPaymentTransaction.mockReset();
    mockAdapterConnect.mockReset();
    mockAdapterSubscribe.mockReset();
    mockAdapterOnConnectionStateChange.mockReset();
    realtimeHandler = null;
    usePaymentStore.getState().resetAsync();
  });

  it("keeps polling active when websocket is unavailable", async () => {
    mockGetPaymentTransaction.mockResolvedValue(apiTx("pending"));
    usePaymentStore.getState().pollTransactionStatus("tx-1", 1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(usePaymentStore.getState().pollingActive).toBe(true);
    expect(usePaymentStore.getState().realtimeTransport).toBe("polling");
    expect(mockAdapterConnect).toHaveBeenCalledTimes(1);
  });

  it("ignores stale realtime sequence updates", async () => {
    mockGetPaymentTransaction.mockResolvedValue(apiTx("pending"));
    usePaymentStore.getState().pollTransactionStatus("tx-1", 1000);
    usePaymentStore.setState({
      currentTransaction: {
        id: "tx-1",
        orderId: "o-1",
        outletId: 1,
        method: "qris",
        amount: 10000,
        status: "pending",
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
      paymentStatus: "pending",
    });
    expect(realtimeHandler).toBeTypeOf("function");
    realtimeHandler?.({
      channel: "payment",
      seq: 5,
      payload: { id: "tx-1", status: "paid" },
      meta: { source: "ws" },
    });
    realtimeHandler?.({
      channel: "payment",
      seq: 3,
      payload: { id: "tx-1", status: "failed" },
      meta: { source: "ws" },
    });

    const state = usePaymentStore.getState();
    expect(state.paymentStatus).toBe("paid");
    expect(state.lastRealtimeSeq).toBe(5);
  });
});
