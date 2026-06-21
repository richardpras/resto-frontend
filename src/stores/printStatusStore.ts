import { create } from "zustand";
import { isHardwareBridgeDeviceOnline } from "@/domain/hardwareBridgeStatus";
import { selectUserCapabilities } from "@/domain/accessControl";
import { listHardwareBridgeDeviceSummaries } from "@/lib/api-integration/hardwareBridgeEndpoints";
import { listPrinterQueueStatus, retryPrinterQueueJob } from "@/lib/api-integration/printerManagementEndpoints";
import { postReceiptReprint } from "@/lib/api-integration/receiptDocumentEndpoints";
import { listReceiptRenderHistory } from "@/lib/api-integration/receiptDocumentEndpoints";

export type PrintHealthState = "online" | "offline" | "pending" | "failed";

type PrintStatusStore = {
  outletId: number | null;
  health: PrintHealthState;
  pending: number;
  failed: number;
  awaitingAck: number;
  bridgeConnected: boolean;
  lastReceiptHistoryId: number | null;
  isLoading: boolean;
  error: string | null;
  refresh: (outletId: number) => Promise<void>;
  retryFailed: () => Promise<void>;
  reprintLastReceipt: () => Promise<void>;
  reset: () => void;
};

function deriveHealth(data: {
  bridgeConnected?: boolean;
  pending?: number;
  failed?: number;
  awaitingAck?: number;
}): PrintHealthState {
  if (!data.bridgeConnected) return "offline";
  if ((data.failed ?? 0) > 0) return "failed";
  if ((data.pending ?? 0) > 0 || (data.awaitingAck ?? 0) > 0) return "pending";
  return "online";
}

async function resolveBridgeConnectedFromHardware(outletId: number): Promise<boolean> {
  if (!selectUserCapabilities().hardwareBridge) return false;
  try {
    const devices = await listHardwareBridgeDeviceSummaries(outletId);
    return devices.some(
      (device) => !device.revokedAt && isHardwareBridgeDeviceOnline(device.lastSeenAt ?? null),
    );
  } catch {
    return false;
  }
}

export const usePrintStatusStore = create<PrintStatusStore>((set, get) => ({
  outletId: null,
  health: "offline",
  pending: 0,
  failed: 0,
  awaitingAck: 0,
  bridgeConnected: false,
  lastReceiptHistoryId: null,
  isLoading: false,
  error: null,

  refresh: async (outletId) => {
    set({ isLoading: true, error: null, outletId });
    try {
      const status = await listPrinterQueueStatus(outletId);
      let bridgeConnected = status.bridgeConnected;
      if (!bridgeConnected) {
        bridgeConnected = await resolveBridgeConnectedFromHardware(outletId);
      }
      let lastReceiptHistoryId = get().lastReceiptHistoryId;
      try {
        const history = await listReceiptRenderHistory(outletId, { sourceType: "order" });
        lastReceiptHistoryId = history[0]?.id ?? lastReceiptHistoryId;
      } catch {
        // receipt history optional for status strip
      }
      set({
        pending: status.pending,
        failed: status.failed,
        awaitingAck: status.awaitingAck,
        bridgeConnected,
        lastReceiptHistoryId,
        health: deriveHealth({ ...status, bridgeConnected }),
        error: null,
      });
    } catch (e) {
      const bridgeConnected = await resolveBridgeConnectedFromHardware(outletId);
      set({
        error: e instanceof Error ? e.message : "Failed to load print status",
        bridgeConnected,
        health: bridgeConnected ? "online" : "offline",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  retryFailed: async () => {
    const outletId = get().outletId;
    if (!outletId) return;
    const status = await listPrinterQueueStatus(outletId);
    const failedJob = status.queues.flatMap((q) => q.jobs).find((j) => j.status === "failed");
    if (!failedJob) return;
    await retryPrinterQueueJob(failedJob.id, failedJob.id);
    await get().refresh(outletId);
  },

  reprintLastReceipt: async () => {
    const outletId = get().outletId;
    const historyId = get().lastReceiptHistoryId;
    if (!outletId || !historyId) return;
    await postReceiptReprint(historyId, "pos-reprint-last");
    await get().refresh(outletId);
  },

  reset: () =>
    set({
      outletId: null,
      health: "offline",
      pending: 0,
      failed: 0,
      awaitingAck: 0,
      bridgeConnected: false,
      lastReceiptHistoryId: null,
      isLoading: false,
      error: null,
    }),
}));
