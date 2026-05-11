import { create } from "zustand";
import { mapCustomer, mapPaginationMeta } from "@/domain/crmAdapters";
import type { AsyncState, Customer, PaginationMeta, ReplayQueueStatus } from "@/domain/crmTypes";
import { getRealtimeAdapter, type RealtimeConnectionState, type RealtimeEnvelope } from "@/domain/realtimeAdapter";
import { getCustomerById, listCustomers } from "@/lib/api-integration/crmEndpoints";
import { selectUserCapabilities } from "@/domain/accessControl";

const DEFAULT_META: PaginationMeta = { currentPage: 1, perPage: 20, total: 0, lastPage: 1 };

function extractRealtimeSeq(event: RealtimeEnvelope): number {
  return event.sequence ?? event.seq ?? event.version ?? 0;
}

type CustomerStoreState = {
  customers: Customer[];
  selectedCustomer: Customer | null;
  activeOutletId: number | null;
  search: string;
  pagination: PaginationMeta;
  lifecycle: AsyncState;
  error: string | null;
  lastSyncAt: string | null;
  inFlightFetchKey: string | null;
  inFlightFetchPromise: Promise<void> | null;
  lastFetchKey: string | null;
  lastFetchedAt: number;
  pollTimer: ReturnType<typeof setInterval> | null;
  pollingActive: boolean;
  realtimeState: RealtimeConnectionState;
  realtimeTransport: "polling" | "websocket";
  lastRealtimeSeq: number;
  replayStatus: ReplayQueueStatus | null;
  realtimeUnsubscribe: (() => void) | null;
  realtimeConnectionUnsubscribe: (() => void) | null;
  fetchCustomers: (params?: { outletId?: number | null; page?: number; perPage?: number; search?: string }) => Promise<void>;
  refreshForOutlet: (outletId: number | null) => Promise<void>;
  fetchCustomerById: (customerId: string) => Promise<Customer | null>;
  startRealtime: () => void;
  stopRealtime: () => void;
  startPollingFallback: (intervalMs?: number) => void;
  stopPollingFallback: () => void;
  reset: () => void;
};

export const useCustomerStore = create<CustomerStoreState>((set, get) => ({
  customers: [],
  selectedCustomer: null,
  activeOutletId: null,
  search: "",
  pagination: DEFAULT_META,
  lifecycle: "idle",
  error: null,
  lastSyncAt: null,
  inFlightFetchKey: null,
  inFlightFetchPromise: null,
  lastFetchKey: null,
  lastFetchedAt: 0,
  pollTimer: null,
  pollingActive: false,
  realtimeState: "idle",
  realtimeTransport: "polling",
  lastRealtimeSeq: 0,
  replayStatus: null,
  realtimeUnsubscribe: null,
  realtimeConnectionUnsubscribe: null,

  fetchCustomers: async (params = {}) => {
    if (!selectUserCapabilities().crm) return;
    const outletId = params.outletId ?? get().activeOutletId;
    if (!outletId || outletId < 1) {
      set({ customers: [], pagination: DEFAULT_META, activeOutletId: null, lifecycle: "success", error: null });
      return;
    }
    const queryKey = JSON.stringify({
      outletId,
      page: params.page ?? get().pagination.currentPage,
      perPage: params.perPage ?? get().pagination.perPage,
      search: params.search ?? get().search,
    });
    const state = get();
    const isFresh = state.lastFetchKey === queryKey && Date.now() - state.lastFetchedAt < 30_000 && state.customers.length > 0;
    if (isFresh) {
      set({ lifecycle: "success", activeOutletId: outletId });
      return;
    }
    if (state.inFlightFetchKey === queryKey && state.inFlightFetchPromise) {
      return state.inFlightFetchPromise;
    }

    set({ lifecycle: "loading", error: null, activeOutletId: outletId, search: params.search ?? get().search, inFlightFetchKey: queryKey });
    const fetchJob = (async () => {
    try {
      const response = await listCustomers({
        outletId,
        page: params.page ?? get().pagination.currentPage,
        perPage: params.perPage ?? get().pagination.perPage,
        search: (params.search ?? get().search) || undefined,
      });
      set({
        customers: response.rows.map(mapCustomer),
        pagination: mapPaginationMeta(response.meta),
        lifecycle: "success",
        error: null,
        lastSyncAt: new Date().toISOString(),
        lastFetchKey: queryKey,
        lastFetchedAt: Date.now(),
        inFlightFetchKey: null,
        inFlightFetchPromise: null,
      });
    } catch (error) {
      set({
        lifecycle: "error",
        error: error instanceof Error ? error.message : "Failed to fetch customers",
        inFlightFetchKey: null,
        inFlightFetchPromise: null,
      });
    }
    })();
    set({ inFlightFetchPromise: fetchJob });
    return fetchJob;
  },

  refreshForOutlet: async (outletId) => {
    await get().fetchCustomers({
      outletId,
      page: 1,
      perPage: get().pagination.perPage || 20,
      search: get().search,
    });
  },

  fetchCustomerById: async (customerId) => {
    try {
      const row = await getCustomerById(customerId);
      const customer = mapCustomer(row);
      set({ selectedCustomer: customer, lastSyncAt: new Date().toISOString() });
      return customer;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch customer detail" });
      return null;
    }
  },

  startRealtime: () => {
    if (!selectUserCapabilities().crm) return;
    if (get().realtimeUnsubscribe) return;
    const adapter = getRealtimeAdapter("crm-customer");
    const connectionUnsubscribe = adapter.onConnectionStateChange((state) => {
      set({
        realtimeState: state,
        realtimeTransport: state === "connected" ? "websocket" : "polling",
      });
    });
    const unsubscribe = adapter.subscribe({
      channel: "crm-customer",
      onEvent: (event) => {
        const payload = (event.payload ?? event.data) as Record<string, unknown> | undefined;
        if (!payload) return;
        const incomingSeq = extractRealtimeSeq(event);
        if (incomingSeq > 0 && incomingSeq <= get().lastRealtimeSeq) return;
        const eventOutlet = Number(payload.outletId ?? payload.outlet_id ?? 0);
        if (eventOutlet > 0 && get().activeOutletId && eventOutlet !== get().activeOutletId) return;
        const replayStatus = typeof payload.replayStatus === "string" ? (payload.replayStatus as ReplayQueueStatus) : null;
        if (replayStatus) {
          set({ replayStatus });
        }
        void get().fetchCustomers({ outletId: get().activeOutletId, page: get().pagination.currentPage });
        set({ lastRealtimeSeq: incomingSeq > 0 ? incomingSeq : get().lastRealtimeSeq });
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
      realtimeState: "disconnected",
      realtimeTransport: "polling",
      lastRealtimeSeq: 0,
    });
  },

  startPollingFallback: (intervalMs = 10000) => {
    if (!selectUserCapabilities().crm) return;
    if (get().pollTimer) return;
    const timer = setInterval(() => {
      if (get().realtimeState === "connected") return;
      void get().fetchCustomers({ outletId: get().activeOutletId, page: get().pagination.currentPage });
    }, intervalMs);
    set({ pollTimer: timer, pollingActive: true });
  },

  stopPollingFallback: () => {
    if (get().pollTimer) clearInterval(get().pollTimer);
    set({ pollTimer: null, pollingActive: false });
  },

  reset: () => {
    get().stopPollingFallback();
    get().stopRealtime();
    set({
      customers: [],
      selectedCustomer: null,
      activeOutletId: null,
      search: "",
      pagination: DEFAULT_META,
      lifecycle: "idle",
      error: null,
      lastSyncAt: null,
      replayStatus: null,
      inFlightFetchKey: null,
      inFlightFetchPromise: null,
      lastFetchKey: null,
      lastFetchedAt: 0,
    });
  },
}));
