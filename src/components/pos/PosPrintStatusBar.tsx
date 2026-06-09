import { useEffect } from "react";
import { Printer, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrintStatusStore } from "@/stores/printStatusStore";

const healthLabel = {
  online: "Printer Online",
  offline: "Printer Offline",
  pending: "Queue Pending",
  failed: "Queue Failed",
} as const;

const healthClass = {
  online: "bg-success/10 text-success",
  offline: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  failed: "bg-destructive/10 text-destructive",
} as const;

export function PosPrintStatusBar({ outletId }: { outletId: number | null }) {
  const health = usePrintStatusStore((s) => s.health);
  const pending = usePrintStatusStore((s) => s.pending);
  const failed = usePrintStatusStore((s) => s.failed);
  const refresh = usePrintStatusStore((s) => s.refresh);
  const retryFailed = usePrintStatusStore((s) => s.retryFailed);
  const reprintLastReceipt = usePrintStatusStore((s) => s.reprintLastReceipt);
  const lastReceiptHistoryId = usePrintStatusStore((s) => s.lastReceiptHistoryId);

  useEffect(() => {
    if (!outletId || outletId < 1) return;
    void refresh(outletId);
    const timer = setInterval(() => {
      void refresh(outletId);
    }, 15000);
    return () => clearInterval(timer);
  }, [outletId, refresh]);

  if (!outletId || outletId < 1) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 p-3 rounded-xl text-sm ${healthClass[health]}`}>
      <Printer className="h-4 w-4 shrink-0" />
      <span className="font-medium">{healthLabel[health]}</span>
      <span className="text-xs opacity-80">
        Pending {pending}
        {failed > 0 ? ` · Failed ${failed}` : ""}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => void refresh(outletId)}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        {failed > 0 ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void retryFailed()}>
            Retry Failed
          </Button>
        ) : null}
        {lastReceiptHistoryId ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void reprintLastReceipt()}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reprint Last
          </Button>
        ) : null}
      </div>
    </div>
  );
}
