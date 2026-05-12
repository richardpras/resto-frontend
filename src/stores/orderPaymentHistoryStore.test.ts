import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOrderPaymentHistoryStore, orderPaymentHistoryCacheKey } from "./orderPaymentHistoryStore";

const mockListOrderPayments = vi.fn();

vi.mock("@/lib/api-integration/endpoints", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-integration/endpoints")>("@/lib/api-integration/endpoints");
  return {
    ...actual,
    listOrderPayments: (...args: unknown[]) => mockListOrderPayments(...args),
  };
});

describe("orderPaymentHistoryStore", () => {
  beforeEach(() => {
    mockListOrderPayments.mockReset();
    useOrderPaymentHistoryStore.setState({
      entries: {},
      interestRefCount: new Map(),
      inflightPromiseByKey: new Map(),
      inflightAbortByKey: new Map(),
    });
  });

  it("dedupes concurrent fetches for the same cache key", async () => {
    let resolve!: (v: unknown[]) => void;
    const barrier = new Promise<unknown[]>((r) => {
      resolve = r;
    });
    mockListOrderPayments.mockReturnValue(barrier);

    const p1 = useOrderPaymentHistoryStore.getState().fetchHistory(1, "99", {});
    const p2 = useOrderPaymentHistoryStore.getState().fetchHistory(1, "99", {});
    expect(mockListOrderPayments).toHaveBeenCalledTimes(1);

    resolve([
      { id: 1, orderId: 99, orderSplitId: null, method: "cash", amount: 10, status: "paid" },
    ]);
    await Promise.all([p1, p2]);

    const key = orderPaymentHistoryCacheKey(1, "99");
    expect(useOrderPaymentHistoryStore.getState().entries[key]?.payments).toHaveLength(1);
    expect(mockListOrderPayments).toHaveBeenCalledTimes(1);
  });

  it("clears cache on refreshOrderAfterPaymentMutation and refetches when a panel has interest", async () => {
    useOrderPaymentHistoryStore.getState().registerInterest(2, "5");
    mockListOrderPayments.mockResolvedValueOnce([
      { id: 1, orderId: 5, orderSplitId: null, method: "cash", amount: 100, status: "paid" },
    ]);
    await useOrderPaymentHistoryStore.getState().fetchHistory(2, "5", {});
    const key = orderPaymentHistoryCacheKey(2, "5");
    expect(useOrderPaymentHistoryStore.getState().entries[key]?.payments).toHaveLength(1);

    mockListOrderPayments.mockResolvedValueOnce([
      { id: 1, orderId: 5, orderSplitId: null, method: "cash", amount: 100, status: "paid" },
      { id: 2, orderId: 5, orderSplitId: null, method: "transfer", amount: 50, status: "paid" },
    ]);
    useOrderPaymentHistoryStore.getState().refreshOrderAfterPaymentMutation(2, "5");
    await vi.waitFor(() => {
      expect(useOrderPaymentHistoryStore.getState().entries[key]?.payments.length).toBe(2);
    });
    useOrderPaymentHistoryStore.getState().unregisterInterest(2, "5");
  });

  it("resetForOutletContextChange clears entries and aborts in-flight", async () => {
    mockListOrderPayments.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves until aborted */
        }),
    );
    void useOrderPaymentHistoryStore.getState().fetchHistory(3, "7", {});
    await new Promise((r) => setTimeout(r, 0));
    useOrderPaymentHistoryStore.getState().resetForOutletContextChange();
    expect(useOrderPaymentHistoryStore.getState().entries).toEqual({});
  });
});
