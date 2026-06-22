import { create } from "zustand";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  closePosSession,
  getCurrentPosSession,
  getPosSessionClosePreview,
  openPosSession,
  type PosSessionApi,
  type PosSessionClosePreview,
} from "@/lib/api-integration/posSessionEndpoints";

type PosSessionState = {
  currentSession: PosSessionApi | null;
  defaultCashFloat: number;
  activeOutletId: number | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  lastSyncAt: string | null;
  inFlightOutletId: number | null;
  inFlightFetch: Promise<PosSessionApi | null> | null;
  bootstrapSyncedOutletId: number | null;
  fetchCurrent: (outletId: number) => Promise<PosSessionApi | null>;
  hydrateFromBootstrap: (outletId: number, session: PosSessionApi | null, defaultCashFloat?: number) => void;
  open: (outletId: number, openingCash?: number, notes?: string) => Promise<PosSessionApi>;
  previewClose: (sessionId: number) => Promise<PosSessionClosePreview>;
  close: (sessionId: number, actualCash: number, notes?: string) => Promise<PosSessionApi>;
  reset: () => void;
};

function mapError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to sync POS session";
}

export const usePosSessionStore = create<PosSessionState>((set) => ({
  currentSession: null,
  defaultCashFloat: 500000,
  activeOutletId: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  lastSyncAt: null,
  inFlightOutletId: null,
  inFlightFetch: null,
  bootstrapSyncedOutletId: null,

  hydrateFromBootstrap: (outletId: number, session: PosSessionApi | null, defaultCashFloat?: number) => {
    set({
      currentSession: session,
      activeOutletId: outletId,
      defaultCashFloat: defaultCashFloat ?? 500000,
      bootstrapSyncedOutletId: outletId,
      lastSyncAt: new Date().toISOString(),
      isLoading: false,
      error: null,
      inFlightOutletId: null,
      inFlightFetch: null,
    });
  },

  fetchCurrent: async (outletId: number) => {
    const state = usePosSessionStore.getState();
    if (state.currentSession && state.activeOutletId === outletId) return state.currentSession;
    if (state.inFlightFetch && state.inFlightOutletId === outletId) return state.inFlightFetch;

    set({ isLoading: true, error: null });
    const job = (async () => {
      try {
        const { session: currentSession, defaultCashFloat } = await getCurrentPosSession(outletId);
        set({
          currentSession,
          defaultCashFloat,
          activeOutletId: outletId,
          bootstrapSyncedOutletId: null,
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

  open: async (outletId: number, openingCash?: number, notes?: string) => {
    set({ isSubmitting: true, error: null });
    try {
      const payload =
        typeof openingCash === "number"
          ? { outletId, openingCash, notes }
          : { outletId, notes };
      const currentSession = await openPosSession(payload);
      set({
        currentSession,
        bootstrapSyncedOutletId: null,
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

  previewClose: async (sessionId: number) => getPosSessionClosePreview(sessionId),

  close: async (sessionId: number, actualCash: number, notes?: string) => {
    set({ isSubmitting: true, error: null });
    try {
      const currentSession = await closePosSession(sessionId, { actualCash, notes });
      set({
        currentSession: null,
        bootstrapSyncedOutletId: null,
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
      defaultCashFloat: 500000,
      activeOutletId: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      lastSyncAt: null,
      inFlightOutletId: null,
      inFlightFetch: null,
      bootstrapSyncedOutletId: null,
    }),
}));
