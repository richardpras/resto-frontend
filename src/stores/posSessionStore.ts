import { create } from "zustand";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  closePosSession,
  getCurrentPosSession,
  openPosSession,
  type PosSessionApi,
} from "@/lib/api-integration/posSessionEndpoints";

type PosSessionState = {
  currentSession: PosSessionApi | null;
  activeOutletId: number | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  lastSyncAt: string | null;
  inFlightOutletId: number | null;
  inFlightFetch: Promise<PosSessionApi | null> | null;
  fetchCurrent: (outletId: number) => Promise<PosSessionApi | null>;
  open: (outletId: number, openingCash: number, notes?: string) => Promise<PosSessionApi>;
  close: (sessionId: number, closingCash: number, notes?: string) => Promise<PosSessionApi>;
  reset: () => void;
};

function mapError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to sync POS session";
}

export const usePosSessionStore = create<PosSessionState>((set) => ({
  currentSession: null,
  activeOutletId: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  lastSyncAt: null,
  inFlightOutletId: null,
  inFlightFetch: null,

  fetchCurrent: async (outletId: number) => {
    const state = usePosSessionStore.getState();
    if (state.currentSession && state.activeOutletId === outletId) return state.currentSession;
    if (state.inFlightFetch && state.inFlightOutletId === outletId) return state.inFlightFetch;

    set({ isLoading: true, error: null });
    const job = (async () => {
    try {
      const currentSession = await getCurrentPosSession(outletId);
      set({
        currentSession,
        activeOutletId: outletId,
        lastSyncAt: new Date().toISOString(),
        inFlightOutletId: null,
        inFlightFetch: null,
      });
      return currentSession;
    } catch (error) {
      const message = mapError(error);
      set({ error: message, inFlightOutletId: null, inFlightFetch: null });
      throw error;
    } finally {
      set({ isLoading: false });
    }
    })();
    set({ inFlightOutletId: outletId, inFlightFetch: job });
    return job;
  },

  open: async (outletId: number, openingCash: number, notes?: string) => {
    set({ isSubmitting: true, error: null });
    try {
      const currentSession = await openPosSession({ outletId, openingCash, notes });
      set({
        currentSession,
        lastSyncAt: new Date().toISOString(),
      });
      return currentSession;
    } catch (error) {
      const message = mapError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  close: async (sessionId: number, closingCash: number, notes?: string) => {
    set({ isSubmitting: true, error: null });
    try {
      const currentSession = await closePosSession(sessionId, { closingCash, notes });
      set({
        currentSession,
        lastSyncAt: new Date().toISOString(),
      });
      return currentSession;
    } catch (error) {
      const message = mapError(error);
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  reset: () =>
    set({
      currentSession: null,
      activeOutletId: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      lastSyncAt: null,
      inFlightOutletId: null,
      inFlightFetch: null,
    }),
}));
