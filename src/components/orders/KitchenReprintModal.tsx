import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Printer } from "lucide-react";
import { toast } from "sonner";
import { postKitchenReprint } from "@/lib/api-integration/receiptDocumentEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";

export type KitchenReprintLine = {
  orderItemId: number;
  name: string;
  qty: number;
  station?: string | null;
};

type KitchenReprintModalProps = {
  open: boolean;
  orderId: number;
  items: KitchenReprintLine[];
  onClose: () => void;
};

export function KitchenReprintModal({ open, orderId, items, onClose }: KitchenReprintModalProps) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(items.map((it) => it.orderItemId)));
  const [submitting, setSubmitting] = useState(false);

  const allIds = useMemo(() => items.map((it) => it.orderItemId), [items]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allIds));
  const selectNone = () => setSelected(new Set());

  const handlePrint = async () => {
    const orderItemIds = [...selected];
    if (orderItemIds.length === 0) {
      toast.error("Select at least one item.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await postKitchenReprint(orderId, orderItemIds);
      toast.success(`Kitchen reprint queued (${result.printJobIds.length} job${result.printJobIds.length === 1 ? "" : "s"})`);
      onClose();
    } catch (error) {
      toast.error(error instanceof ApiHttpError ? error.message : "Kitchen reprint failed.");
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
        className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
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
              <Printer className="h-5 w-5" /> Reprint dapur / bar
            </h3>
            <button type="button" className="p-1 rounded-lg hover:bg-muted" onClick={onClose} disabled={submitting}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex gap-2 text-xs mb-2">
            <button type="button" className="text-primary hover:underline" onClick={selectAll}>
              Pilih semua
            </button>
            <span className="text-muted-foreground">·</span>
            <button type="button" className="text-primary hover:underline" onClick={selectNone}>
              Kosongkan
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto space-y-1.5 mb-4 pr-1" data-testid="kitchen-reprint-items">
            {items.map((item) => (
              <li key={item.orderItemId}>
                <label className="flex items-start gap-2 rounded-lg border border-border/60 px-2 py-2 cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selected.has(item.orderItemId)}
                    onChange={() => toggle(item.orderItemId)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground block truncate">{item.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      Qty {item.qty}
                      {item.station ? ` · ${item.station}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={submitting || selected.size === 0}
            onClick={() => void handlePrint()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40"
          >
            {submitting ? "Mengirim…" : `Cetak ulang (${selected.size} item)`}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
