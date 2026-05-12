import { create } from "zustand";
import { ApiHttpError, createObservabilityHeaders, type RequestObservabilityMetadata } from "@/lib/api-integration/client";
import {
  listOrderPayments as apiListOrderPayments,
  type OrderPaymentHistoryItem,
} from "@/lib/api-integration/endpoints";
import { useAuthStore } from "./authStore";

function mapApiError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load payment history";
}

export type OrderPaymentHistoryEntry = {
  payments: OrderPaymentHistoryItem[];
  error: string | null;
  initialLoading: boolean;
  backgroundRefreshing: boolean;
  fetchedAt: string | null;
};

export function orderPaymentHistoryCacheKey(outletId: number | null, orderId: string): string {
  return `${outletId ?? "none"}:${orderId}`;
}

type OrderPaymentHistoryState = {
  entries: Record<string, OrderPaymentHistoryEntry>;
  /** Ref-counted keys (`outletId:orderId`) for panels that want realtime refresh on upstream order changes. */
  interestRefCount: Map<string, number>;
  inflightPromiseByKey: Map<string, Promise<void>>;
  inflightAbortByKey: Map<string, AbortController>;
  registerInterest: (outletId: number | null, orderId: string) => void;
  unregisterInterest: (outletId: number | null, orderId: string) => void;
  /** Clears cache and aborts in-flight; call when outlet context changes. */
  resetForOutletContextChange: () => void;
  getEntry: (outletId: number | null, orderId: string) => OrderPaymentHistoryEntry | undefined;
  ensureLoaded: (outletId: number | null, orderId: string) => void;
  fetchHistory: (
    outletId: number | null,
    orderId: string,
    opts?: { background?: boolean; force?: boolean },
  ) => Promise<void>;
  /** After POST payments or other authoritative server changes — clears cache and refetches if a panel is open. */
  refreshOrderAfterPaymentMutation: (outletId: number | null, orderId: string) => void;
  /** After `fetchOrder` / realtime single-order refresh — background refresh if a panel is watching this order. */
  onOrderUpstreamSnapshot: (outletId: number | null, orderId: string) => void;
};

function emptyEntry(): OrderPaymentHistoryEntry {
  return {
    payments: [],
    error: null,
    initialLoading: false,
    backgroundRefreshing: false,
    fetchedAt: null,
  };
}

function abortInflightKey(
  key: string,
  inflightAbortByKey: Map<string, AbortController>,
  inflightPromiseByKey: Map<string, Promise<void>>,
): void {
  const c = inflightAbortByKey.get(key);
  c?.abort();
  inflightAbortByKey.delete(key);
  inflightPromiseByKey.delete(key);
}

export const useOrderPaymentHistoryStore = create<OrderPaymentHistoryState>((set, get) => ({
  entries: {},
  interestRefCount: new Map(),
  inflightPromiseByKey: new Map(),
  inflightAbortByKey: new Map(),

  registerInterest: (outletId, orderId) => {
    const key = orderPaymentHistoryCacheKey(outletId, orderId);
    const n = (get().interestRefCount.get(key) ?? 0) + 1;
    const next = new Map(get().interestRefCount);
    next.set(key, n);
    set({ interestRefCount: next });
  },

  unregisterInterest: (outletId, orderId) => {
    const key = orderPaymentHistoryCacheKey(outletId, orderId);
    const prev = get().interestRefCount.get(key) ?? 0;
    const n = Math.max(0, prev - 1);
    const next = new Map(get().interestRefCount);
    if (n <= 0) next.delete(key);
    else next.set(key, n);
    set({ interestRefCount: next });
  },

  resetForOutletContextChange: () => {
    const inflightAbortByKey = new Map(get().inflightAbortByKey);
    for (const c of inflightAbortByKey.values()) {
      c.abort();
    }
    set({
      entries: {},
      interestRefCount: new Map(),
      inflightPromiseByKey: new Map(),
      inflightAbortByKey: new Map(),
    });
  },

  getEntry: (outletId, orderId) => get().entries[orderPaymentHistoryCacheKey(outletId, orderId)],

  ensureLoaded: (outletId, orderId) => {
    if (!orderId) return;
    const key = orderPaymentHistoryCacheKey(outletId, orderId);
    const existing = get().entries[key];
    if (existing?.fetchedAt && !existing.error) return;
    void get().fetchHistory(outletId, orderId, { background: false, force: false });
  },

  fetchHistory: async (outletId, orderId, opts = {}) => {
    if (!orderId) return;
    useAuthStore.getState().syncApiBearerForRequests();
    const { background = false, force = false } = opts;
    const key = orderPaymentHistoryCacheKey(outletId, orderId);

    if (!force) {
      const pending = get().inflightPromiseByKey.get(key);
      if (pending) {
        await pending;
        return;
      }
    } else {
      abortInflightKey(key, get().inflightAbortByKey, get().inflightPromiseByKey);
    }

    const controller = new AbortController();
    get().inflightAbortByKey.set(key, controller);

    const requestMeta: RequestObservabilityMetadata = {
      scope: "order-payment-history",
      action: "list-order-payments",
      recovery: true,
    };

    const run = async (): Promise<void> => {
      const prev = get().entries[key] ?? emptyEntry();
      set({
        entries: {
          ...get().entries,
          [key]: {
            ...prev,
            error: null,
            initialLoading: !background && !prev.fetchedAt,
            backgroundRefreshing: background || Boolean(prev.fetchedAt),
          },
        },
      });

      try {
        const payments = await apiListOrderPayments(orderId, {
          signal: controller.signal,
          headers: createObservabilityHeaders(requestMeta),
        });
        if (controller.signal.aborted) return;
        set({
          entries: {
            ...get().entries,
            [key]: {
              payments,
              error: null,
              initialLoading: false,
              backgroundRefreshing: false,
              fetchedAt: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message = mapApiError(error);
        set({
          entries: {
            ...get().entries,
            [key]: {
              ...(get().entries[key] ?? emptyEntry()),
              payments: get().entries[key]?.payments ?? [],
              error: message,
              initialLoading: false,
              backgroundRefreshing: false,
              fetchedAt: get().entries[key]?.fetchedAt ?? null,
            },
          },
        });
      } finally {
        get().inflightAbortByKey.delete(key);
        get().inflightPromiseByKey.delete(key);
      }
    };

    const p = run();
    get().inflightPromiseByKey.set(key, p);
    await p;
  },

  refreshOrderAfterPaymentMutation: (outletId, orderId) => {
    const key = orderPaymentHistoryCacheKey(outletId, orderId);
    abortInflightKey(key, get().inflightAbortByKey, get().inflightPromiseByKey);
    set((s) => {
      const { [key]: _removed, ...rest } = s.entries;
      return { entries: rest };
    });
    const interested = (get().interestRefCount.get(key) ?? 0) > 0;
    if (interested) {
      void get().fetchHistory(outletId, orderId, { background: true, force: true });
    }
  },

  onOrderUpstreamSnapshot: (outletId, orderId) => {
    const key = orderPaymentHistoryCacheKey(outletId, orderId);
    if ((get().interestRefCount.get(key) ?? 0) <= 0) return;
    void get().fetchHistory(outletId, orderId, { background: true, force: true });
  },
}));
