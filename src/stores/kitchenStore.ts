import { create } from "zustand";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  listKitchenTickets as apiListKitchenTickets,
  updateKitchenTicketStatus as apiUpdateKitchenTicketStatus,
  type KitchenTicketListMeta,
  type KitchenTicketStatus,
  type ListKitchenTicketsParams,
} from "@/lib/api-integration/kitchenEndpoints";
import { mapKitchenTicketApiToStore, type KitchenTicket } from "@/domain/kitchenAdapters";

type KitchenStore = {
  tickets: KitchenTicket[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  pagination: KitchenTicketListMeta | null;
  lastSyncAt: string | null;
  lastListParams: ListKitchenTicketsParams | null;
  pollingMs: number;
  pollTimer: ReturnType<typeof setInterval> | null;
  fetchTickets: (params?: ListKitchenTicketsParams) => Promise<KitchenTicket[]>;
  revalidateTickets: () => Promise<KitchenTicket[] | null>;
  updateTicketStatus: (ticketId: string, status: KitchenTicketStatus) => Promise<KitchenTicket>;
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

export const useKitchenStore = create<KitchenStore>((set, get) => ({
  tickets: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  pagination: null,
  lastSyncAt: null,
  lastListParams: null,
  pollingMs: 8000,
  pollTimer: null,

  fetchTickets: async (params) => {
    set({ isLoading: true, error: null, lastListParams: params ?? null });
    try {
      const result = await apiListKitchenTickets(params);
      const mapped = result.tickets.map(mapKitchenTicketApiToStore);
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
      set({ isLoading: false });
    }
  },

  revalidateTickets: async () => {
    const params = get().lastListParams;
    if (params === null) return null;
    return get().fetchTickets(params);
  },

  updateTicketStatus: async (ticketId, status) => {
    set({ isSubmitting: true, error: null });
    try {
      const updatedApi = await apiUpdateKitchenTicketStatus(ticketId, status);
      const updated = mapKitchenTicketApiToStore(updatedApi);
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
      set({ isSubmitting: false });
    }
  },

  startPolling: async (params, intervalMs = 8000) => {
    get().stopPolling();
    set({ pollingMs: intervalMs, lastListParams: params });
    await get().fetchTickets(params);
    const timer = setInterval(() => {
      void get().revalidateTickets();
    }, intervalMs);
    set({ pollTimer: timer });
  },

  stopPolling: () => {
    const timer = get().pollTimer;
    if (timer) clearInterval(timer);
    set({ pollTimer: null });
  },

  resetAsync: () =>
    set({
      isLoading: false,
      isSubmitting: false,
      error: null,
      pagination: null,
      lastSyncAt: null,
      lastListParams: null,
    }),
}));
