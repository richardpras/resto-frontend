import { create } from "zustand";
import type { PrinterProfileInput, PrinterQueueSummary } from "@/domain/operationsTypes";
import { listPrinterQueues, retryPrinterQueueJob } from "@/lib/api-integration/printerManagementEndpoints";
import { patchPrinter, postPrinter } from "@/lib/api-integration/settingsDomainEndpoints";
import { getApiAccessToken } from "@/lib/api-integration/client";
import { useSettingsStore, type Printer } from "@/stores/settingsStore";

type PrinterManagementStore = {
  queueByPrinter: PrinterQueueSummary[];
  isLoadingQueue: boolean;
  isSavingProfile: boolean;
  error: string | null;
  fetchQueueStatus: () => Promise<void>;
  saveProfile: (profile: PrinterProfileInput) => Promise<void>;
  retryFailedJob: (printerId: string, jobId: string) => Promise<void>;
  reset: () => void;
};

function toSettingsPrinter(profile: PrinterProfileInput): Printer {
  return {
    id: profile.id,
    name: profile.name,
    printerType: profile.printerType,
    connection: profile.connection,
    ip: profile.ip,
    bluetoothDevice: profile.bluetoothDevice,
    outletId: profile.outletId,
    assignedCategories: profile.routeRules ?? profile.assignedCategories,
  };
}

export const usePrinterManagementStore = create<PrinterManagementStore>((set, get) => ({
  queueByPrinter: [],
  isLoadingQueue: false,
  isSavingProfile: false,
  error: null,

  fetchQueueStatus: async () => {
    set({ isLoadingQueue: true, error: null });
    try {
      const queueByPrinter = await listPrinterQueues();
      set({ queueByPrinter });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to load printer queue" });
    } finally {
      set({ isLoadingQueue: false });
    }
  },

  saveProfile: async (profile) => {
    set({ isSavingProfile: true, error: null });
    try {
      const state = useSettingsStore.getState();
      const exists = state.printers.some((item) => item.id === profile.id);
      const payload = toSettingsPrinter(profile);
      if (!getApiAccessToken()) {
        state.upsertPrinter(payload);
      } else {
        const saved = exists ? await patchPrinter(profile.id, payload) : await postPrinter(payload);
        state.upsertPrinter(saved);
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to save printer profile" });
      throw error;
    } finally {
      set({ isSavingProfile: false });
    }
  },

  retryFailedJob: async (printerId, jobId) => {
    set({ error: null });
    try {
      const updated = await retryPrinterQueueJob(printerId, jobId);
      set((state) => ({
        queueByPrinter: state.queueByPrinter.map((queue) => {
          if (queue.printerId !== printerId) return queue;
          const jobs = queue.jobs.map((job) =>
            job.id === jobId
              ? { ...job, status: updated.status, attempts: updated.attempts }
              : job,
          );
          const pending = jobs.filter((job) => job.status === "pending").length;
          const failed = jobs.filter((job) => job.status === "failed").length;
          const printing = jobs.filter((job) => job.status === "printing").length;
          return { ...queue, jobs, pending, failed, printing };
        }),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to retry print job" });
      throw error;
    }
  },

  reset: () => {
    set({
      queueByPrinter: [],
      isLoadingQueue: false,
      isSavingProfile: false,
      error: null,
    });
  },
}));
