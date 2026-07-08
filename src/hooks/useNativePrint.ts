import { useCallback, useEffect, useState } from "react";
import { isNativeAndroid } from "@/mobile/platform";
import { getCloudPrintAdapter } from "@/mobile/print/CloudPrintAdapter";
import {
  buildCustomerReceiptDocument,
  buildKitchenChitDocument,
  receiptContextFromBootstrap,
} from "@/mobile/print/thermalDocumentBuilder";
import type { OfflineBootstrapSnapshot } from "@/mobile/offline/offlineBootstrapDb";
import type { Order } from "@/stores/orderStore";
import { postPrintCustomerBill } from "@/lib/api-integration/receiptDocumentEndpoints";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import {
  detectNativePrinterKind,
  resolveNativePrintPort,
  resetNativePrintPortCache,
  type NativePrinterKind,
} from "@/mobile/print/resolvePrintPort";

export function useNativePrint(bootstrap: OfflineBootstrapSnapshot | null, outletId: number | null) {
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const ctx = receiptContextFromBootstrap(bootstrap);
  const [printerKind, setPrinterKind] = useState<NativePrinterKind>("none");

  useEffect(() => {
    if (!isNativeAndroid()) {
      setPrinterKind("none");
      return;
    }
    resetNativePrintPortCache();
    void detectNativePrinterKind(outletId).then(setPrinterKind);
  }, [outletId]);

  const printCustomerReceipt = useCallback(
    async (order: Order) => {
      if (isNativeAndroid()) {
        const port = await resolveNativePrintPort(outletId);
        const doc = buildCustomerReceiptDocument(order, ctx);
        const result = await port.printDocument(doc);
        if (!result.ok && printerKind === "none") {
          return { ok: false as const, error: "Configure Bluetooth printer in POS ribbon" };
        }
        return result;
      }
      if (isOnline && outletId && !order.id.startsWith("local:")) {
        await postPrintCustomerBill(Number(order.id), outletId);
        return { ok: true as const };
      }
      return { ok: false as const, error: "Printer unavailable" };
    },
    [ctx, isOnline, outletId, printerKind],
  );

  const printKitchenChit = useCallback(
    async (order: Pick<Order, "code" | "tableName" | "orderType" | "items" | "id">) => {
      if (!isNativeAndroid()) {
        return { ok: false as const, error: "Native printer required" };
      }
      const port = await resolveNativePrintPort(outletId);
      const doc = buildKitchenChitDocument(order, ctx);
      const result = await port.printDocument(doc);
      if (!result.ok && printerKind === "none") {
        return { ok: false as const, error: "Configure Bluetooth printer in POS ribbon" };
      }
      return result;
    },
    [ctx, outletId, printerKind],
  );

  const printerAvailable = useCallback(async () => {
    if (!isNativeAndroid()) return getCloudPrintAdapter().isAvailable();
    const port = await resolveNativePrintPort(outletId);
    return port.isAvailable();
  }, [outletId]);

  const refreshPrinterDetection = useCallback(() => {
    resetNativePrintPortCache();
    void detectNativePrinterKind(outletId).then(setPrinterKind);
  }, [outletId]);

  return {
    printCustomerReceipt,
    printKitchenChit,
    printerAvailable,
    printerKind,
    refreshPrinterDetection,
    isNativePrint: isNativeAndroid(),
    /** @deprecated use printerAvailable */
    sunmiAvailable: printerAvailable,
  };
}
