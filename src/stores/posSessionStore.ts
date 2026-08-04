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
import { isNativePosShell } from "@/mobile/platform";
import {
  createLocalSessionId,
  localSessionNumericId,
  saveLocalSessionMapping,
} from "@/mobile/offline/offlineSessionMapping";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { useAuthStore } from "@/stores/authStore";

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
  /** Maps negative local session id → local-session:uuid ref */
  localSessionRefs: Record<number, string>;
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

async function shaFingerprint(parts: string[]): Promise<string> {
  const raw = parts.join("|");
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return `fp-${raw}`;
}

function shouldQueueOffline(): boolean {
  return isNativePosShell() && !useOfflineSyncStore.getState().isOnline;
}

export const usePosSessionStore = create<PosSessionState>((set, get) => ({
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
  localSessionRefs: {},

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

    if (shouldQueueOffline()) {
      return state.activeOutletId === outletId ? state.currentSession : null;
    }

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
      if (shouldQueueOffline()) {
        const localRef = createLocalSessionId();
        const numericId = localSessionNumericId(localRef);
        const userId = Number(useAuthStore.getState().user?.id ?? 0);
        const currentSession: PosSessionApi = {
          id: numericId,
          outletId,
          openedByUserId: userId,
          closedByUserId: null,
          status: "open",
          openingCash: typeof openingCash === "number" ? openingCash : get().defaultCashFloat,
          closingCash: null,
          expectedCash: null,
          actualCash: null,
          cashVariance: null,
          openedAt: new Date().toISOString(),
          closedAt: null,
          notes: notes ?? null,
        };
        const payload: Record<string, unknown> = {
          outletId,
          notes,
          clientLocalRef: localRef,
        };
        if (typeof openingCash === "number") payload.openingCash = openingCash;
        const fp = await shaFingerprint(["pos_session.open", localRef, String(outletId)]);
        await useOfflineSyncStore.getState().enqueueReplayableOperation({
          outletId,
          fingerprint: fp,
          operationType: "pos_session.open",
          payload,
        });
        await saveLocalSessionMapping(localRef, 0).catch(() => undefined);
        set({
          currentSession,
          activeOutletId: outletId,
          bootstrapSyncedOutletId: null,
          lastSyncAt: new Date().toISOString(),
          localSessionRefs: { ...get().localSessionRefs, [numericId]: localRef },
        });
        return currentSession;
      }

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

  previewClose: async (sessionId: number) => {
    if (shouldQueueOffline() || sessionId < 1) {
      const session = get().currentSession;
      const opening = session?.openingCash ?? get().defaultCashFloat;
      return {
        sessionId,
        outletId: get().activeOutletId ?? session?.outletId ?? 0,
        defaultCashFloat: get().defaultCashFloat,
        drawerReconciliation: {
          openingCash: opening,
          cashSales: 0,
          cashRefunds: 0,
          cashExpenses: 0,
          cashIn: 0,
          cashOut: 0,
          expected: opening,
          actual: null,
          variance: null,
          status: "offline_estimate",
          limitations: ["Offline close preview uses opening cash only; reconcile after sync."],
        },
      };
    }
    return getPosSessionClosePreview(sessionId);
  },

  close: async (sessionId: number, actualCash: number, notes?: string) => {
    set({ isSubmitting: true, error: null });
    try {
      if (shouldQueueOffline()) {
        const localRef = get().localSessionRefs[sessionId];
        const payload: Record<string, unknown> = {
          sessionId: sessionId > 0 ? sessionId : 0,
          actualCash,
          notes,
        };
        if (localRef) payload.clientLocalRef = localRef;
        const fp = await shaFingerprint([
          "pos_session.close",
          localRef ?? String(sessionId),
          String(actualCash),
        ]);
        const outletId = get().activeOutletId ?? get().currentSession?.outletId ?? 0;
        if (outletId < 1) throw new Error("Outlet required to close session offline");
        await useOfflineSyncStore.getState().enqueueReplayableOperation({
          outletId,
          fingerprint: fp,
          operationType: "pos_session.close",
          payload,
        });
        const closed: PosSessionApi = {
          ...(get().currentSession as PosSessionApi),
          id: sessionId,
          status: "closed",
          actualCash,
          closedAt: new Date().toISOString(),
          notes: notes ?? null,
          closedByUserId: Number(useAuthStore.getState().user?.id ?? 0),
        };
        set({
          currentSession: null,
          bootstrapSyncedOutletId: null,
          lastSyncAt: new Date().toISOString(),
        });
        return closed;
      }

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
      localSessionRefs: {},
    }),
}));
