import { create } from "zustand";
import { getDashboardSummary } from "@/lib/api-integration/monitoringEndpoints";
import type { DashboardSummary } from "@/domain/operationsTypes";
import { EMPTY_OFFLINE_RESILIENCE, EMPTY_QR_QUEUE } from "@/domain/operationsTypes";
import { selectUserCapabilities } from "@/domain/accessControl";
import { ApiHttpError } from "@/lib/api-integration/client";

const EMPTY_SUMMARY: DashboardSummary = {
  kpis: {
    revenueToday: 0,
    orderCountToday: 0,
    avgOrderValue: 0,
    customerCount: 0,
  },
  hourlyOrders: [],
  topMenus: [],
  recentTransactions: [],
  monitoring: {
    activePosSessions: 0,
    pendingKitchenTickets: 0,
    paymentSuccessRate: 0,
    stalePayments: 0,
    qrQueue: EMPTY_QR_QUEUE,
    printerQueue: { pending: 0, failed: 0, recoverable: 0, deadLetter: 0 },
    offlineResilience: EMPTY_OFFLINE_RESILIENCE,
    hardwareBridge: {},
  },
  crmMetrics: {
    activeCustomers: 0,
    repeatVisitRate: 0,
    loyaltyPointsIssued: 0,
    loyaltyPointsRedeemed: 0,
    topTierCounts: {},
    customerRetentionIndicators: {
      customersWithRecentVisit: 0,
      inactiveCustomers30d: 0,
    },
  },
  bestSellerOtherOutlets: [],
};

type DashboardSummaryStore = {
  summary: DashboardSummary;
  isLoading: boolean;
  initialLoading: boolean;
  switchingOutlet: boolean;
  backgroundRefreshing: boolean;
  realtimeRefreshing: boolean;
  hasLoadedOnce: boolean;
  activeOutletId: number | null;
  error: string | null;
  lastSuccessfulSyncAt: string | null;
  inFlightRequestId: number;
  refresh: (outletId?: number | null, mode?: "initial" | "outlet-switch" | "background" | "realtime") => Promise<void>;
  markRealtimeRefreshing: (active: boolean) => void;
  reset: () => void;
};

export const useDashboardSummaryStore = create<DashboardSummaryStore>((set, get) => ({
  summary: EMPTY_SUMMARY,
  isLoading: false,
  initialLoading: false,
  switchingOutlet: false,
  backgroundRefreshing: false,
  realtimeRefreshing: false,
  hasLoadedOnce: false,
  activeOutletId: null,
  error: null,
  lastSuccessfulSyncAt: null,
  inFlightRequestId: 0,

  refresh: async (outletId, mode = "background") => {
    if (!selectUserCapabilities().monitoring) return;
    const requestId = get().inFlightRequestId + 1;
    const targetOutlet = typeof outletId === "number" && outletId >= 1 ? outletId : null;
    const isInitial = mode === "initial";
    const isOutletSwitch = mode === "outlet-switch";
    set((state) => ({
      inFlightRequestId: requestId,
      activeOutletId: targetOutlet,
      error: null,
      initialLoading: isInitial,
      switchingOutlet: isOutletSwitch,
      backgroundRefreshing: mode === "background" && !state.initialLoading && !state.switchingOutlet,
      realtimeRefreshing: mode === "realtime",
      isLoading: isInitial || isOutletSwitch,
    }));
    try {
      const summary = await getDashboardSummary(targetOutlet);
      set((state) => {
        if (state.inFlightRequestId !== requestId) return state;
        return {
          summary,
          hasLoadedOnce: true,
          lastSuccessfulSyncAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 403) {
        set((state) => {
          if (state.inFlightRequestId !== requestId) return state;
          return {
            isLoading: false,
            initialLoading: false,
            switchingOutlet: false,
            backgroundRefreshing: false,
            realtimeRefreshing: false,
          };
        });
        return;
      }
      set((state) => {
        if (state.inFlightRequestId !== requestId) return state;
        return { error: error instanceof Error ? error.message : "Failed to load dashboard summary" };
      });
    } finally {
      set((state) => {
        if (state.inFlightRequestId !== requestId) return state;
        return {
          isLoading: false,
          initialLoading: false,
          switchingOutlet: false,
          backgroundRefreshing: false,
          realtimeRefreshing: false,
        };
      });
    }
  },

  markRealtimeRefreshing: (active) => {
    set({ realtimeRefreshing: active });
  },

  reset: () => {
    set({
      summary: EMPTY_SUMMARY,
      isLoading: false,
      initialLoading: false,
      switchingOutlet: false,
      backgroundRefreshing: false,
      realtimeRefreshing: false,
      hasLoadedOnce: false,
      activeOutletId: null,
      error: null,
      lastSuccessfulSyncAt: null,
      inFlightRequestId: 0,
    });
  },
}));

