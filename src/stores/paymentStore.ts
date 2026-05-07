import { create } from "zustand";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  createPaymentTransaction as apiCreatePaymentTransaction,
  expirePaymentTransaction as apiExpirePaymentTransaction,
  getPaymentTransaction as apiGetPaymentTransaction,
  reconcilePaymentTransaction as apiReconcilePaymentTransaction,
  type PaymentTransactionStatus,
} from "@/lib/api-integration/paymentEndpoints";
import { mapPaymentTransactionApiToModel, type PaymentTransaction } from "@/domain/paymentAdapters";

const DEFAULT_POLLING_MS = 3000;

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
  createPaymentTransaction: (payload: {
    orderId: string | number;
    outletId?: number;
    method: string;
    amount: number;
    provider?: string;
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
  retryPayment: (id?: string) => Promise<PaymentTransaction>;
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

  createPaymentTransaction: async (payload) => {
    get().stopPolling();
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    set({ isSubmitting: true, error: null });
    set({ activeRequestId: requestId, activeAbortController: controller });
    try {
      const created = mapPaymentTransactionApiToModel(
        await apiCreatePaymentTransaction(payload, { signal: controller.signal }),
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
    set({ activeRequestId: requestId, activeAbortController: controller });

    const refresh = async () => {
      if (get().activeRequestId !== requestId) return;
      set({ isLoading: true, error: null });
      try {
        const current = mapPaymentTransactionApiToModel(
          await apiGetPaymentTransaction(id, { signal: controller.signal }),
        );
        if (get().activeRequestId !== requestId) return;
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
    });
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
    const previousPolling = get().pollingActive;
    get().stopPolling();
    set({ isSubmitting: true, error: null });
    set({ activeRequestId: requestId, activeAbortController: controller });
    try {
      const updated = mapPaymentTransactionApiToModel(
        await apiReconcilePaymentTransaction(txId, { signal: controller.signal }),
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

  retryPayment: async (id) => {
    let tx = get().currentTransaction;
    const txId = id ?? tx?.id;
    if (!txId) throw new Error("No payment transaction selected");
    if (!tx || tx.id !== txId) {
      tx = mapPaymentTransactionApiToModel(await apiGetPaymentTransaction(txId));
    }
    if (!tx.orderId) throw new Error("Payment transaction is missing order context");
    const updated = await get().createPaymentTransaction({
      orderId: tx.orderId,
      outletId: tx.outletId ?? undefined,
      method: tx.method,
      amount: tx.amount,
      provider:
        typeof tx.providerMetadataSnapshot?.provider === "string"
          ? tx.providerMetadataSnapshot.provider
          : undefined,
    });
    get().pollTransactionStatus(updated.id);
    return updated;
  },

  stopPolling: () => {
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
    });
  },

  resetAsync: () => {
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
    });
  },
}));
