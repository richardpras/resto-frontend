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
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  lastSyncAt: string | null;
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
  isLoading: false,
  isSubmitting: false,
  error: null,
  lastSyncAt: null,

  fetchCurrent: async (outletId: number) => {
    set({ isLoading: true, error: null });
    try {
      const currentSession = await getCurrentPosSession(outletId);
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
      set({ isLoading: false });
    }
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
      isLoading: false,
      isSubmitting: false,
      error: null,
      lastSyncAt: null,
    }),
}));
