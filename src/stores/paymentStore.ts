import { create } from "zustand";
import {
  ApiHttpError,
  createObservabilityHeaders,
  type RequestObservabilityMetadata,
} from "@/lib/api-integration/client";
import {
  createPaymentTransaction as apiCreatePaymentTransaction,
  expirePaymentTransaction as apiExpirePaymentTransaction,
  getPaymentTransaction as apiGetPaymentTransaction,
  reconcilePaymentTransaction as apiReconcilePaymentTransaction,
  simulateSandboxXenditPaidTransaction as apiSimulateSandboxXenditPaidTransaction,
  simulateViaXenditProvider as apiSimulateViaXenditProvider,
  type PaymentTransactionStatus,
} from "@/lib/api-integration/paymentEndpoints";
import { mapPaymentTransactionApiToModel, type PaymentTransaction } from "@/domain/paymentAdapters";
import { splitPaymentsFromTransactionSnapshot } from "@/features/pos/gatewayCheckoutUtils";
import {
  getRealtimeAdapter,
  type RealtimeConnectionState,
  type RealtimeEnvelope,
} from "@/domain/realtimeAdapter";

const DEFAULT_POLLING_MS = 3000;

/** Clears checkout tab-visibility listener registered during payment polling. */
let paymentVisibilityCleanup: (() => void) | null = null;

function clearPaymentVisibilityCleanup(): void {
  paymentVisibilityCleanup?.();
  paymentVisibilityCleanup = null;
}

function mapApiError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Payment transaction request failed";
}

type PaymentStore = {
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  paymentStatus: PaymentTransactionStatus | null;
  expiresAt: Date | null;
  checkoutUrl: string;
  qrString: string;
  deeplinkUrl: string;
  lastSyncAt: string | null;
  currentTransaction: PaymentTransaction | null;
  pollingActive: boolean;
  expiryCountdown: number;
  pollingTimer: ReturnType<typeof setInterval> | null;
  expiryTimer: ReturnType<typeof setInterval> | null;
  activeRequestId: number;
  activeAbortController: AbortController | null;
  lastRequestMeta: RequestObservabilityMetadata | null;
  realtimeConnected: boolean;
  realtimeState: RealtimeConnectionState;
  realtimeTransport: "polling" | "websocket";
  lastRealtimeMeta: Record<string, unknown> | null;
  lastRealtimeSeq: number;
  realtimeUnsubscribe: (() => void) | null;
  realtimeConnectionUnsubscribe: (() => void) | null;
  createPaymentTransaction: (payload: {
    orderId: string | number;
    outletId?: number;
    method: string;
    amount: number;
    provider?: string;
    externalReference?: string;
    idempotencyKey?: string;
    currency?: string;
    providerMetadata?: Record<string, unknown>;
    splitPayments?: {
      method: string;
      amount: number;
      allocations?: { orderItemId: string | number; qty: number; amount: number }[];
    }[];
  }) => Promise<PaymentTransaction>;
  pollTransactionStatus: (id: string, intervalMs?: number) => void;
  expireTransaction: (id?: string) => Promise<PaymentTransaction>;
  reconcileTransaction: (id?: string) => Promise<PaymentTransaction>;
  retryPayment: (
    id?: string,
    options?: {
      splitPayments?: {
        method: string;
        amount: number;
        allocations?: { orderItemId: string | number; qty: number; amount: number }[];
      }[];
    },
  ) => Promise<PaymentTransaction>;
  simulateSandboxPaid: (id?: string) => Promise<PaymentTransaction>;
  simulateViaProvider: (id?: string) => Promise<PaymentTransaction>;
  startRealtime: () => void;
  stopRealtime: () => void;
  stopPolling: () => void;
  resetAsync: () => void;
};

function isTerminalStatus(status: string): boolean {
  return status === "paid" || status === "failed" || status === "expired" || status === "cancelled";
}

function computeExpiryCountdownSeconds(tx: PaymentTransaction | null): number {
  const expiry = tx?.expiresAt ?? tx?.expiryTime;
  if (!expiry) return 0;
  return Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 1000));
}

function nextTransactionState(tx: PaymentTransaction) {
  return {
    currentTransaction: tx,
    paymentStatus: tx.status,
    expiresAt: tx.expiresAt ?? tx.expiryTime,
    checkoutUrl: tx.checkoutUrl,
    qrString: tx.qrString,
    deeplinkUrl: tx.deeplinkUrl,
    expiryCountdown: computeExpiryCountdownSeconds(tx),
    lastSyncAt: new Date().toISOString(),
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function extractRealtimeSeq(event: RealtimeEnvelope): number {
  return event.sequence ?? event.seq ?? event.version ?? 0;
}

export const usePaymentStore = create<PaymentStore>((set, get) => ({
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
  realtimeConnected: false,
  realtimeState: "idle",
  realtimeTransport: "polling",
  lastRealtimeMeta: null,
  lastRealtimeSeq: 0,
  realtimeUnsubscribe: null,
  realtimeConnectionUnsubscribe: null,

  createPaymentTransaction: async (payload) => {
    get().stopPolling();
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "payment-store",
      action: "create-payment-transaction",
      requestId,
    };
    set({ isSubmitting: true, error: null });
    set({ activeRequestId: requestId, activeAbortController: controller, lastRequestMeta: requestMeta });
    try {
      const created = mapPaymentTransactionApiToModel(
        await apiCreatePaymentTransaction(payload, {
          signal: controller.signal,
          headers: createObservabilityHeaders(requestMeta),
        }),
      );
      if (get().activeRequestId !== requestId) return created;
      set(nextTransactionState(created));
      return created;
    } catch (error) {
      if (!isAbortError(error) && get().activeRequestId === requestId) {
        set({ error: mapApiError(error) });
      }
      throw error;
    } finally {
      if (get().activeRequestId === requestId) {
        set({ isSubmitting: false, activeAbortController: null });
      }
    }
  },

  pollTransactionStatus: (id, intervalMs = DEFAULT_POLLING_MS) => {
    get().stopPolling();
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "payment-store",
      action: "poll-transaction-status",
      requestId,
      recovery: true,
    };
    set({ activeRequestId: requestId, activeAbortController: controller, lastRequestMeta: requestMeta });
    let latestRefreshSeq = 0;

    const refresh = async () => {
      if (get().activeRequestId !== requestId) return;
      const refreshSeq = latestRefreshSeq + 1;
      latestRefreshSeq = refreshSeq;
      set({ isLoading: true, error: null });
      try {
        const current = mapPaymentTransactionApiToModel(
          await apiGetPaymentTransaction(id, {
            signal: controller.signal,
            headers: createObservabilityHeaders({ ...requestMeta, requestId: refreshSeq }),
          }),
        );
        if (get().activeRequestId !== requestId || refreshSeq !== latestRefreshSeq) return;
        set(nextTransactionState(current));
        if (isTerminalStatus(current.status)) {
          set({ isLoading: false });
          get().stopPolling();
        }
      } catch (error) {
        if (!isAbortError(error) && get().activeRequestId === requestId) {
          set({ error: mapApiError(error) });
        }
      } finally {
        if (get().activeRequestId === requestId) set({ isLoading: false });
      }
    };

    clearPaymentVisibilityCleanup();
    if (typeof document !== "undefined") {
      const onVisibility = () => {
        if (document.visibilityState === "visible") void refresh();
      };
      document.addEventListener("visibilitychange", onVisibility);
      paymentVisibilityCleanup = () => document.removeEventListener("visibilitychange", onVisibility);
    }

    const pollingTimer = setInterval(() => {
      void refresh();
    }, intervalMs);
    const expiryTimer = setInterval(() => {
      set((state) => ({
        expiryCountdown: state.expiryCountdown > 0 ? state.expiryCountdown - 1 : 0,
      }));
    }, 1000);

    set({
      pollingActive: true,
      pollingTimer,
      expiryTimer,
      realtimeTransport: get().realtimeConnected ? "websocket" : "polling",
    });
    get().startRealtime();
    void refresh();
  },

  expireTransaction: async (id) => {
    const txId = id ?? get().currentTransaction?.id;
    if (!txId) throw new Error("No payment transaction selected");
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    get().stopPolling();
    set({ isSubmitting: true, error: null });
    set({ activeRequestId: requestId, activeAbortController: controller });
    try {
      const updated = mapPaymentTransactionApiToModel(await apiExpirePaymentTransaction(txId));
      if (get().activeRequestId !== requestId) return updated;
      set(nextTransactionState(updated));
      if (isTerminalStatus(updated.status)) get().stopPolling();
      return updated;
    } catch (error) {
      if (!isAbortError(error) && get().activeRequestId === requestId) {
        set({ error: mapApiError(error) });
      }
      throw error;
    } finally {
      if (get().activeRequestId === requestId) set({ isSubmitting: false, activeAbortController: null });
    }
  },

  reconcileTransaction: async (id) => {
    const txId = id ?? get().currentTransaction?.id;
    if (!txId) throw new Error("No payment transaction selected");
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "payment-store",
      action: "reconcile-transaction",
      requestId,
      recovery: true,
    };
    const previousPolling = get().pollingActive;
    get().stopPolling();
    set({ isSubmitting: true, error: null });
    set({ activeRequestId: requestId, activeAbortController: controller, lastRequestMeta: requestMeta });
    try {
      const updated = mapPaymentTransactionApiToModel(
        await apiReconcilePaymentTransaction(txId, {
          signal: controller.signal,
          headers: createObservabilityHeaders(requestMeta),
        }),
      );
      if (get().activeRequestId !== requestId) return updated;
      set(nextTransactionState(updated));
      if (isTerminalStatus(updated.status)) get().stopPolling();
      else if (previousPolling) get().pollTransactionStatus(updated.id);
      return updated;
    } catch (error) {
      if (!isAbortError(error) && get().activeRequestId === requestId) {
        set({ error: mapApiError(error) });
      }
      throw error;
    } finally {
      if (get().activeRequestId === requestId) set({ isSubmitting: false, activeAbortController: null });
    }
  },

  retryPayment: async (id, options) => {
    let tx = get().currentTransaction;
    const txId = id ?? tx?.id;
    if (!txId) throw new Error("No payment transaction selected");
    if (!tx || tx.id !== txId) {
      tx = mapPaymentTransactionApiToModel(await apiGetPaymentTransaction(txId));
    }
    if (!tx.orderId) throw new Error("Payment transaction is missing order context");
    const splitPayments =
      options?.splitPayments ?? splitPaymentsFromTransactionSnapshot(tx.payloadSnapshot);
    const updated = await get().createPaymentTransaction({
      orderId: tx.orderId,
      outletId: tx.outletId ?? undefined,
      method: tx.method,
      amount: tx.amount,
      provider:
        typeof tx.providerMetadataSnapshot?.provider === "string"
          ? tx.providerMetadataSnapshot.provider
          : undefined,
      splitPayments,
    });
    get().pollTransactionStatus(updated.id);
    return updated;
  },

  simulateSandboxPaid: async (id) => {
    const txId = id ?? get().currentTransaction?.id;
    if (!txId) throw new Error("No payment transaction selected");
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "payment-store",
      action: "simulate-sandbox-paid",
      requestId,
      recovery: true,
    };
    const previousPolling = get().pollingActive;
    set({ isSubmitting: true, error: null });
    set({ activeRequestId: requestId, activeAbortController: controller, lastRequestMeta: requestMeta });
    try {
      const updated = mapPaymentTransactionApiToModel(
        await apiSimulateSandboxXenditPaidTransaction(txId, {
          signal: controller.signal,
          headers: createObservabilityHeaders(requestMeta),
        }),
      );
      if (get().activeRequestId !== requestId) return updated;
      set(nextTransactionState(updated));
      if (isTerminalStatus(updated.status)) get().stopPolling();
      else if (previousPolling) get().pollTransactionStatus(updated.id);
      return updated;
    } catch (error) {
      if (!isAbortError(error) && get().activeRequestId === requestId) {
        set({ error: mapApiError(error) });
      }
      throw error;
    } finally {
      if (get().activeRequestId === requestId) set({ isSubmitting: false, activeAbortController: null });
    }
  },

  simulateViaProvider: async (id) => {
    const txId = id ?? get().currentTransaction?.id;
    if (!txId) throw new Error("No payment transaction selected");
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "payment-store",
      action: "simulate-via-xendit-provider",
      requestId,
      recovery: true,
    };
    const previousPolling = get().pollingActive;
    set({ isSubmitting: true, error: null });
    set({ activeRequestId: requestId, activeAbortController: controller, lastRequestMeta: requestMeta });
    try {
      const dispatched = mapPaymentTransactionApiToModel(
        await apiSimulateViaXenditProvider(txId, {
          signal: controller.signal,
          headers: createObservabilityHeaders(requestMeta),
        }),
      );
      if (get().activeRequestId !== requestId) return dispatched;
      set(nextTransactionState(dispatched));
      if (isTerminalStatus(dispatched.status)) {
        get().stopPolling();
        return dispatched;
      }

      // Non-optimistic fallback: immediately reconcile provider status in case webhook delivery is delayed/failed.
      const reconciled = mapPaymentTransactionApiToModel(
        await apiReconcilePaymentTransaction(dispatched.id, {
          signal: controller.signal,
          headers: createObservabilityHeaders({ ...requestMeta, action: "simulate-via-xendit-provider-reconcile" }),
        }),
      );
      if (get().activeRequestId !== requestId) return reconciled;
      set(nextTransactionState(reconciled));
      if (isTerminalStatus(reconciled.status)) get().stopPolling();
      else if (previousPolling) get().pollTransactionStatus(reconciled.id);
      return reconciled;
    } catch (error) {
      if (!isAbortError(error) && get().activeRequestId === requestId) {
        set({ error: mapApiError(error) });
      }
      throw error;
    } finally {
      if (get().activeRequestId === requestId) set({ isSubmitting: false, activeAbortController: null });
    }
  },

  startRealtime: () => {
    if (get().realtimeUnsubscribe) return;
    const adapter = getRealtimeAdapter("payment");
    const updateConnectionState = adapter.onConnectionStateChange((state) => {
      set({
        realtimeState: state,
        realtimeConnected: state === "connected",
        realtimeTransport: state === "connected" ? "websocket" : "polling",
      });
    });
    const unsubscribe = adapter.subscribe({
      channel: "payment",
      onEvent: (event) => {
        const state = get();
        const tx = state.currentTransaction;
        const payload = (event.payload ?? event.data) as Partial<PaymentTransaction> | undefined;
        if (!tx || !payload) return;
        const payloadId = payload.id ? String(payload.id) : undefined;
        if (payloadId && payloadId !== tx.id) return;
        const incomingSeq = extractRealtimeSeq(event);
        if (incomingSeq > 0 && incomingSeq <= state.lastRealtimeSeq) return;
        const nextTx: PaymentTransaction = {
          ...tx,
          ...payload,
          id: payloadId ?? tx.id,
        };
        set({
          ...nextTransactionState(nextTx),
          lastRealtimeMeta: event.meta ?? null,
          lastRealtimeSeq: incomingSeq > 0 ? incomingSeq : state.lastRealtimeSeq,
        });
        if (isTerminalStatus(nextTx.status)) {
          get().stopPolling();
        }
      },
    });
    set({ realtimeUnsubscribe: unsubscribe, realtimeConnectionUnsubscribe: updateConnectionState });
    adapter.connect();
  },

  stopRealtime: () => {
    get().realtimeUnsubscribe?.();
    get().realtimeConnectionUnsubscribe?.();
    set({
      realtimeUnsubscribe: null,
      realtimeConnectionUnsubscribe: null,
      realtimeConnected: false,
      realtimeState: "disconnected",
      realtimeTransport: "polling",
      lastRealtimeMeta: null,
      lastRealtimeSeq: 0,
    });
  },

  stopPolling: () => {
    clearPaymentVisibilityCleanup();
    const { pollingTimer, expiryTimer, activeAbortController } = get();
    if (pollingTimer) clearInterval(pollingTimer);
    if (expiryTimer) clearInterval(expiryTimer);
    activeAbortController?.abort();
    set({
      pollingTimer: null,
      expiryTimer: null,
      pollingActive: false,
      activeAbortController: null,
      activeRequestId: get().activeRequestId + 1,
      lastRequestMeta: null,
      realtimeTransport: get().realtimeConnected ? "websocket" : "polling",
    });
  },

  resetAsync: () => {
    get().stopRealtime();
    get().stopPolling();
    set({
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
      expiryCountdown: 0,
      lastRequestMeta: null,
      realtimeState: "idle",
      realtimeConnected: false,
      realtimeTransport: "polling",
      lastRealtimeMeta: null,
      lastRealtimeSeq: 0,
    });
  },
}));
