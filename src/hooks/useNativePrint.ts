import { useCallback, useEffect, useState } from "react";
import { isNativeAndroid } from "@/mobile/platform";
import {
  buildCustomerReceiptDocument,
  buildKitchenChitDocuments,
  receiptContextFromBootstrap,
} from "@/mobile/print/thermalDocumentBuilder";
import type { OfflineBootstrapSnapshot } from "@/mobile/offline/offlineBootstrapDb";
import type { Order, OrderItem } from "@/stores/orderStore";
import {
  postKitchenReprint,
  postPrintCustomerBill,
  postPrintCustomerSplitReceipt,
} from "@/lib/api-integration/receiptDocumentEndpoints";
import { buildSplitPersonReceiptOrder } from "@/features/pos/buildSplitPersonReceiptOrder";
import type { SplitPerson } from "@/stores/orderStore";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { useAuthStore } from "@/stores/authStore";
import { usePrintStatusStore } from "@/stores/printStatusStore";
import {
  detectNativePrinterKind,
  resolveNativePrintPort,
  resetNativePrintPortCache,
  type NativePrinterKind,
} from "@/mobile/print/resolvePrintPort";
import { PRINTER_CONFIG_CHANGED_EVENT } from "@/mobile/print/printerConfigEvents";

export type PrintAttemptResult =
  | { ok: true; via: "bridge" | "sunmi" | "bluetooth" }
  | { ok: false; skipped: true; reason: "no_printer" }
  | { ok: false; skipped: false; error: string };

export type KitchenPrintOptions = {
  /**
   * When true, allow bridge kitchen-reprint if device printer is unavailable.
   * Use for Pay Now after deferred kitchen queue; keep false on Confirm Order
   * (server already queued kitchen jobs).
   */
  allowBridge?: boolean;
};

/**
 * APK print resolution (online + offline):
 * 1) Device printer first when available (Sunmi → Bluetooth) — works offline for local + server orders
 * 2) Bridge / settings printer only when online + bridge connected + non-local order ids
 * 3) If none → canPrint=false (disable Print bill / Reprint); pay & kitchen confirm still save without printing
 *
 * Offline never calls bridge APIs; all soft/auto prints use the device printer only.
 */
export function useNativePrint(bootstrap: OfflineBootstrapSnapshot | null, outletId: number | null) {
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const bridgeConnected = usePrintStatusStore((s) => s.bridgeConnected);
  const cashierName = useAuthStore((s) => s.user?.name ?? "");
  const ctx = {
    ...receiptContextFromBootstrap(bootstrap),
    cashierName,
  };
  const [nativeKind, setNativeKind] = useState<NativePrinterKind>("none");

  const refreshPrinterDetection = useCallback(() => {
    resetNativePrintPortCache();
    if (!isNativeAndroid()) {
      setNativeKind("none");
      return;
    }
    void detectNativePrinterKind(outletId).then(setNativeKind);
  }, [outletId]);

  useEffect(() => {
    refreshPrinterDetection();
  }, [refreshPrinterDetection, isOnline]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => refreshPrinterDetection();
    window.addEventListener(PRINTER_CONFIG_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PRINTER_CONFIG_CHANGED_EVENT, onChange);
  }, [refreshPrinterDetection]);

  // Keep bridgeConnected fresh so canPrint reflects Settings/bridge availability.
  useEffect(() => {
    if (!outletId || outletId < 1 || !isOnline) return;
    void usePrintStatusStore.getState().refresh(outletId);
  }, [outletId, isOnline]);

  const bridgeReady = Boolean(isOnline && bridgeConnected && outletId && outletId >= 1);
  const nativeReady = isNativeAndroid() && nativeKind !== "none";
  /** Explicit print actions (bill / reprint) should be enabled only when a path exists. */
  const canPrint = bridgeReady || nativeReady;
  /** Offline device print path (Bluetooth/Sunmi). Bridge is never available offline. */
  const offlinePrintReady = !isOnline && nativeReady;

  const printCustomerReceipt = useCallback(
    async (order: Order): Promise<PrintAttemptResult> => {
      const isLocal = order.id.startsWith("local:");

      // Device printer first — required for offline and preferred for APK sequencing.
      if (isNativeAndroid() && nativeReady) {
        const port = await resolveNativePrintPort(outletId);
        const doc = await buildCustomerReceiptDocument(order, ctx);
        const result = await port.printDocument(doc);
        if (!result.ok) {
          return { ok: false, skipped: false, error: result.error || "Print failed" };
        }
        const kind = await detectNativePrinterKind(outletId);
        return { ok: true, via: kind === "sunmi" ? "sunmi" : "bluetooth" };
      }

      // Bridge only when online (never offline / never local ids).
      if (isOnline && bridgeReady && !isLocal && outletId) {
        try {
          await postPrintCustomerBill(Number(order.id), outletId);
          return { ok: true, via: "bridge" };
        } catch (error) {
          return {
            ok: false,
            skipped: false,
            error: error instanceof Error ? error.message : "Bridge print failed",
          };
        }
      }

      return { ok: false, skipped: true, reason: "no_printer" };
    },
    [bridgeReady, ctx, isOnline, nativeReady, outletId],
  );

  const printKitchenChit = useCallback(
    async (
      order: Pick<Order, "code" | "tableName" | "orderType" | "items" | "id">,
      options?: KitchenPrintOptions,
    ): Promise<PrintAttemptResult> => {
      const allowBridge = Boolean(options?.allowBridge) && isOnline;
      const isLocal = String(order.id).startsWith("local:");

      if (isNativeAndroid() && nativeReady) {
        const port = await resolveNativePrintPort(outletId);
        const docs = buildKitchenChitDocuments(order, ctx);
        for (const doc of docs) {
          const result = await port.printDocument(doc);
          if (!result.ok) {
            return { ok: false, skipped: false, error: result.error || "Print failed" };
          }
        }
        const kind = await detectNativePrinterKind(outletId);
        return { ok: true, via: kind === "sunmi" ? "sunmi" : "bluetooth" };
      }

      if (allowBridge && bridgeReady && !isLocal && outletId) {
        const orderItemIds = (order.items as OrderItem[])
          .map((item) => Number(item.orderItemId))
          .filter((id) => Number.isFinite(id) && id > 0);
        if (orderItemIds.length === 0) {
          return { ok: false, skipped: false, error: "No order item ids for kitchen print" };
        }
        try {
          await postKitchenReprint(Number(order.id), orderItemIds);
          return { ok: true, via: "bridge" };
        } catch (error) {
          return {
            ok: false,
            skipped: false,
            error: error instanceof Error ? error.message : "Bridge kitchen print failed",
          };
        }
      }

      return { ok: false, skipped: true, reason: "no_printer" };
    },
    [bridgeReady, ctx, isOnline, nativeReady, outletId],
  );

  /** Soft print for pay / kitchen confirm — never blocks the save path. */
  const tryPrintCustomerReceipt = useCallback(
    async (order: Order): Promise<PrintAttemptResult> => {
      if (!canPrint) {
        return { ok: false, skipped: true, reason: "no_printer" };
      }
      return printCustomerReceipt(order);
    },
    [canPrint, printCustomerReceipt],
  );

  const tryPrintKitchenChit = useCallback(
    async (
      order: Pick<Order, "code" | "tableName" | "orderType" | "items" | "id">,
      options?: KitchenPrintOptions,
    ): Promise<PrintAttemptResult> => {
      return printKitchenChit(order, options);
    },
    [printKitchenChit],
  );

  /**
   * Soft print after a split guest finishes paying.
   * Offline / Bluetooth: local ESC/POS for that person (no serverSplitId required).
   * Online bridge-only: queue customer_receipt for orderSplitId.
   */
  const tryPrintSplitPersonReceipt = useCallback(
    async (
      order: Order,
      person: Pick<SplitPerson, "label" | "items" | "payments" | "totalDue" | "serverSplitId">,
      splitMethod: "equal" | "by-item",
    ): Promise<PrintAttemptResult> => {
      const isLocal = order.id.startsWith("local:");

      if (isNativeAndroid() && nativeReady) {
        const port = await resolveNativePrintPort(outletId);
        const scoped = buildSplitPersonReceiptOrder(order, person, splitMethod);
        const doc = await buildCustomerReceiptDocument(scoped, ctx, { isProforma: false });
        const result = await port.printDocument(doc);
        if (!result.ok) {
          return { ok: false, skipped: false, error: result.error || "Print failed" };
        }
        const kind = await detectNativePrinterKind(outletId);
        return { ok: true, via: kind === "sunmi" ? "sunmi" : "bluetooth" };
      }

      if (
        isOnline &&
        bridgeReady &&
        !isLocal &&
        outletId &&
        person.serverSplitId != null &&
        person.serverSplitId > 0
      ) {
        try {
          await postPrintCustomerSplitReceipt(Number(order.id), outletId, person.serverSplitId);
          return { ok: true, via: "bridge" };
        } catch (error) {
          return {
            ok: false,
            skipped: false,
            error: error instanceof Error ? error.message : "Bridge split print failed",
          };
        }
      }

      return { ok: false, skipped: true, reason: "no_printer" };
    },
    [bridgeReady, ctx, isOnline, nativeReady, outletId],
  );

  return {
    printCustomerReceipt,
    printKitchenChit,
    tryPrintCustomerReceipt,
    tryPrintKitchenChit,
    tryPrintSplitPersonReceipt,
    canPrint,
    bridgeReady,
    nativeReady,
    offlinePrintReady,
    isOnline,
    printerKind: nativeKind,
    refreshPrinterDetection,
    isNativePrint: isNativeAndroid(),
    /** @deprecated use canPrint / nativeReady */
    printerAvailable: async () => canPrint,
    /** @deprecated use printerAvailable */
    sunmiAvailable: async () => nativeReady,
  };
}
