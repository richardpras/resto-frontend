import { create } from "zustand";
import {
  ApiHttpError,
  createObservabilityHeaders,
  type RequestObservabilityMetadata,
} from "@/lib/api-integration/client";
import {
  listKitchenTickets as apiListKitchenTickets,
  updateKitchenTicketStatus as apiUpdateKitchenTicketStatus,
  type KitchenTicketListMeta,
  type KitchenTicketStatus,
  type ListKitchenTicketsParams,
} from "@/lib/api-integration/kitchenEndpoints";
import { reportOrderItemRecovery } from "@/lib/api-integration/endpoints";
import { mapKitchenTicketApiToStore, type KitchenTicket } from "@/domain/kitchenAdapters";
import {
  getRealtimeAdapter,
  type RealtimeConnectionState,
  type RealtimeEnvelope,
} from "@/domain/realtimeAdapter";
import { useAuthStore } from "@/stores/authStore";

type KitchenStore = {
  tickets: KitchenTicket[];
  isLoading: boolean;
  isSubmitting: boolean;
  recoverySubmitting: boolean;
  error: string | null;
  pagination: KitchenTicketListMeta | null;
  lastSyncAt: string | null;
  lastListParams: ListKitchenTicketsParams | null;
  pollingMs: number;
  pollTimer: ReturnType<typeof setInterval> | null;
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
  fetchTickets: (params?: ListKitchenTicketsParams, opts?: { background?: boolean }) => Promise<KitchenTicket[]>;
  revalidateTickets: () => Promise<KitchenTicket[] | null>;
  reportItemRecovery: (
    orderId: string,
    orderItemId: string,
    targetStatus: string,
    reason?: string | null,
  ) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: KitchenTicketStatus) => Promise<KitchenTicket>;
  startRealtime: () => void;
  stopRealtime: () => void;
  startPolling: (params: ListKitchenTicketsParams, intervalMs?: number) => Promise<void>;
  stopPolling: () => void;
  resetAsync: () => void;
};

function mapApiError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Kitchen request failed";
}

function upsertTicket(tickets: KitchenTicket[], next: KitchenTicket): KitchenTicket[] {
  const index = tickets.findIndex((ticket) => ticket.id === next.id);
  if (index === -1) return [next, ...tickets];
  const copy = tickets.slice();
  copy[index] = next;
  return copy;
}

function extractRealtimeSeq(event: RealtimeEnvelope): number {
  return event.sequence ?? event.seq ?? event.version ?? 0;
}

export const useKitchenStore = create<KitchenStore>((set, get) => ({
  tickets: [],
  isLoading: false,
  isSubmitting: false,
  recoverySubmitting: false,
  error: null,
  pagination: null,
  lastSyncAt: null,
  lastListParams: null,
  pollingMs: 8000,
  pollTimer: null,
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

  fetchTickets: async (params, opts) => {
    const resolvedParams = params ?? get().lastListParams;
    if (resolvedParams === null) {
      return get().tickets;
    }
    const background = opts?.background === true && get().tickets.length > 0;
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "kitchen-store",
      action: background ? "fetch-tickets-background" : "fetch-tickets",
      requestId,
    };
    if (!background) {
      set({
        isLoading: true,
        error: null,
        lastListParams: resolvedParams,
        activeRequestId: requestId,
        activeAbortController: controller,
        lastRequestMeta: requestMeta,
      });
    } else {
      set({
        lastListParams: resolvedParams,
        activeRequestId: requestId,
        activeAbortController: controller,
        lastRequestMeta: requestMeta,
      });
    }
    try {
      const result = await apiListKitchenTickets(resolvedParams, {
        signal: controller.signal,
        headers: createObservabilityHeaders(requestMeta),
      });
      const mapped = result.tickets.map(mapKitchenTicketApiToStore);
      if (get().activeRequestId !== requestId) return mapped;
      set({
        tickets: mapped,
        pagination: result.meta,
        lastSyncAt: new Date().toISOString(),
      });
      return mapped;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      if (get().activeRequestId === requestId) {
        set({
          ...(background ? {} : { isLoading: false }),
          activeAbortController: null,
        });
      }
    }
  },

  revalidateTickets: async () => {
    const params = get().lastListParams;
    if (params === null) return null;
    return get().fetchTickets(params, { background: get().tickets.length > 0 });
  },

  reportItemRecovery: async (orderId, orderItemId, targetStatus, reason) => {
    useAuthStore.getState().syncApiBearerForRequests();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "kitchen-store",
      action: "report-item-recovery",
      requestId: get().activeRequestId + 1,
      recovery: true,
    };
    set({ recoverySubmitting: true, error: null, lastRequestMeta: requestMeta });
    try {
      await reportOrderItemRecovery(
        orderId,
        orderItemId,
        { targetStatus, reason: reason ?? null },
        { headers: createObservabilityHeaders(requestMeta) },
      );
      const p = get().lastListParams;
      if (p !== null) {
        await get().fetchTickets(p, { background: get().tickets.length > 0 });
      }
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ recoverySubmitting: false });
    }
  },

  updateTicketStatus: async (ticketId, status) => {
    const requestId = get().activeRequestId + 1;
    const controller = new AbortController();
    const requestMeta: RequestObservabilityMetadata = {
      scope: "kitchen-store",
      action: "update-ticket-status",
      requestId,
      recovery: true,
    };
    set({
      isSubmitting: true,
      error: null,
      activeRequestId: requestId,
      activeAbortController: controller,
      lastRequestMeta: requestMeta,
    });
    try {
      const updatedApi = await apiUpdateKitchenTicketStatus(ticketId, status, {
        signal: controller.signal,
        headers: createObservabilityHeaders(requestMeta),
      });
      const updated = mapKitchenTicketApiToStore(updatedApi);
      if (get().activeRequestId !== requestId) return updated;
      set((state) => ({
        tickets: upsertTicket(state.tickets, updated),
        lastSyncAt: new Date().toISOString(),
      }));
      void get().revalidateTickets();
      return updated;
    } catch (error) {
      const message = mapApiError(error);
      set({ error: message });
      throw error;
    } finally {
      // Always clear submitting. Do not gate on `activeRequestId === requestId`: `revalidateTickets()`
      // calls `fetchTickets`, which bumps `activeRequestId` before this `finally` runs, which would
      // otherwise leave `isSubmitting` stuck true and disable every KDS action until a full refresh.
      const stillOwnsAbortSlot = get().activeRequestId === requestId;
      set({
        isSubmitting: false,
        ...(stillOwnsAbortSlot ? { activeAbortController: null } : {}),
      });
    }
  },

  startRealtime: () => {
    if (get().realtimeUnsubscribe) return;
    const adapter = getRealtimeAdapter("kitchen");
    const connectionUnsubscribe = adapter.onConnectionStateChange((state) => {
      set({
        realtimeState: state,
        realtimeConnected: state === "connected",
        realtimeTransport: state === "connected" ? "websocket" : "polling",
      });
    });
    const unsubscribe = adapter.subscribe({
      channel: "kitchen",
      onEvent: (event) => {
        const payload = (event.payload ?? event.data) as Partial<KitchenTicket> | undefined;
        if (!payload || payload.id == null) return;
        const incomingSeq = extractRealtimeSeq(event);
        const state = get();
        if (incomingSeq > 0 && incomingSeq <= state.lastRealtimeSeq) return;
        set((current) => ({
          tickets: upsertTicket(current.tickets, {
            ...(current.tickets.find((t) => t.id === String(payload.id)) ?? ({} as KitchenTicket)),
            ...(payload as KitchenTicket),
            id: String(payload.id),
          }),
          lastSyncAt: new Date().toISOString(),
          lastRealtimeMeta: event.meta ?? null,
          lastRealtimeSeq: incomingSeq > 0 ? incomingSeq : current.lastRealtimeSeq,
        }));
      },
    });
    set({ realtimeUnsubscribe: unsubscribe, realtimeConnectionUnsubscribe: connectionUnsubscribe });
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

  startPolling: async (params, intervalMs = 8000) => {
    get().stopPolling();
    set({ pollingMs: intervalMs, lastListParams: params });
    get().startRealtime();
    await get().fetchTickets(params);
    const timer = setInterval(() => {
      void get().revalidateTickets();
    }, intervalMs);
    set({ pollTimer: timer });
  },

  stopPolling: () => {
    const { pollTimer, activeAbortController } = get();
    const timer = pollTimer;
    if (timer) clearInterval(timer);
    activeAbortController?.abort();
    set({
      pollTimer: null,
      activeAbortController: null,
      activeRequestId: get().activeRequestId + 1,
      lastRequestMeta: null,
    });
  },

  resetAsync: () => {
    get().stopRealtime();
    get().stopPolling();
    set({
      isLoading: false,
      isSubmitting: false,
      recoverySubmitting: false,
      error: null,
      pagination: null,
      lastSyncAt: null,
      lastListParams: null,
      activeAbortController: null,
      lastRequestMeta: null,
      realtimeConnected: false,
      realtimeState: "idle",
      realtimeTransport: "polling",
      lastRealtimeMeta: null,
      lastRealtimeSeq: 0,
    });
  },
}));
