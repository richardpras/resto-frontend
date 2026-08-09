import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Printer } from "lucide-react";
import { toast } from "sonner";
import { postKitchenReprint } from "@/lib/api-integration/receiptDocumentEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import { useNativePrint } from "@/hooks/useNativePrint";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import type { OfflineBootstrapSnapshot } from "@/mobile/offline/offlineBootstrapDb";
import { isLocalOrderId } from "@/mobile/offline/offlineIdMapping";

export type KitchenReprintLine = {
  /** Stable UI key (works for local / offline lines without numeric orderItemId). */
  lineKey: string;
  /** Server order_item id when known — required for bridge API reprint. */
  orderItemId: number | null;
  name: string;
  qty: number;
  notes?: string;
  category?: string;
  station?: string | null;
};

type KitchenReprintModalProps = {
  open: boolean;
  /** Server numeric id or `local:…` offline id. */
  orderId: string;
  orderCode: string;
  tableName?: string;
  orderType?: string;
  items: KitchenReprintLine[];
  outletId: number | null;
  bootstrap?: OfflineBootstrapSnapshot | null;
  onClose: () => void;
};

export function KitchenReprintModal({
  open,
  orderId,
  orderCode,
  tableName,
  orderType,
  items,
  outletId,
  bootstrap = null,
  onClose,
}: KitchenReprintModalProps) {
  const { t } = useOpsTranslation();
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const { tryPrintKitchenChit, nativeReady, canPrint } = useNativePrint(bootstrap, outletId);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map((it) => it.lineKey)));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(items.map((it) => it.lineKey)));
    }
  }, [open, items]);

  const allKeys = useMemo(() => items.map((it) => it.lineKey), [items]);
  const numericOrderId = !isLocalOrderId(orderId) && /^\d+$/.test(orderId) ? Number(orderId) : null;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allKeys));
  const selectNone = () => setSelected(new Set());

  const handlePrint = async () => {
    const chosen = items.filter((it) => selected.has(it.lineKey));
    if (chosen.length === 0) {
      toast.error(t("ordersExplorer.kitchenReprint.toasts.selectAtLeastOne"));
      return;
    }

    setSubmitting(true);
    try {
      // Offline / device printer: always print locally (no API).
      if (nativeReady) {
        const result = await tryPrintKitchenChit(
          {
            id: orderId,
            code: orderCode,
            tableName,
            orderType: orderType ?? "dine-in",
            items: chosen.map((it) => ({
              id: it.lineKey,
              orderItemId: it.orderItemId != null ? String(it.orderItemId) : undefined,
              name: it.name,
              qty: it.qty,
              price: 0,
              emoji: "🍽️",
              notes: it.notes ?? "",
              category: it.category ?? it.station ?? undefined,
            })),
          },
          { allowBridge: false },
        );
        if (!result.ok) {
          if (result.skipped) {
            toast.error(
              t("pos.printerUnavailable", {
                defaultValue: "No printer configured (bridge or Bluetooth).",
              }),
            );
          } else {
            toast.error(result.error || t("ordersExplorer.kitchenReprint.toasts.failed"));
          }
          return;
        }
        toast.success(
          t("ordersExplorer.kitchenReprint.toasts.printedNative", {
            defaultValue: "Kitchen ticket sent to printer.",
            count: chosen.length,
          }),
        );
        onClose();
        return;
      }

      // Online bridge path (desktop / no device printer).
      if (!isOnline || numericOrderId == null) {
        toast.error(
          t("pos.printerUnavailable", {
            defaultValue: "No printer configured (bridge or Bluetooth).",
          }),
        );
        return;
      }

      const orderItemIds = chosen
        .map((it) => it.orderItemId)
        .filter((id): id is number => id != null && Number.isFinite(id) && id > 0);
      if (orderItemIds.length === 0) {
        toast.error(t("ordersExplorer.kitchenReprint.toasts.selectAtLeastOne"));
        return;
      }

      const result = await postKitchenReprint(numericOrderId, orderItemIds);
      toast.success(t("ordersExplorer.kitchenReprint.toasts.queued", { count: result.printJobIds.length }));
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiHttpError ? error.message : t("ordersExplorer.kitchenReprint.toasts.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-modal bg-black/50 flex items-center justify-center p-4"
        onClick={() => !submitting && onClose()}
        data-testid="kitchen-reprint-backdrop"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-card rounded-2xl w-full max-w-md p-5 pos-shadow-md max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5" /> {t("ordersExplorer.kitchenReprint.title")}
            </h3>
            <button type="button" className="p-1 rounded-lg hover:bg-muted" onClick={onClose} disabled={submitting}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {!canPrint && !isOnline ? (
            <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">
              {t("pos.printerUnavailable", {
                defaultValue: "No printer configured (bridge or Bluetooth).",
              })}
            </p>
          ) : null}

          <div className="flex gap-2 text-xs mb-2">
            <button type="button" className="text-primary hover:underline" onClick={selectAll}>
              {t("ordersExplorer.kitchenReprint.selectAll")}
            </button>
            <span className="text-muted-foreground">·</span>
            <button type="button" className="text-primary hover:underline" onClick={selectNone}>
              {t("ordersExplorer.kitchenReprint.clearAll")}
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto space-y-1.5 mb-4 pr-1" data-testid="kitchen-reprint-items">
            {items.map((item) => (
              <li key={item.lineKey}>
                <label className="flex items-start gap-2 rounded-lg border border-border/60 px-2 py-2 cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selected.has(item.lineKey)}
                    onChange={() => toggle(item.lineKey)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground block truncate">{item.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {t("ordersExplorer.kitchenReprint.qty", { qty: item.qty })}
                      {item.station ? ` · ${item.station}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={submitting || selected.size === 0 || (!canPrint && !isOnline)}
            onClick={() => void handlePrint()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40"
          >
            {submitting
              ? t("ordersExplorer.kitchenReprint.submitting")
              : t("ordersExplorer.kitchenReprint.printButton", { count: selected.size })}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
