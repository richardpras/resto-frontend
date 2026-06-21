import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Printer, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrintStatusStore } from "@/stores/printStatusStore";

const healthClass = {
  online: "bg-success/10 text-success",
  offline: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  failed: "bg-destructive/10 text-destructive",
} as const;

const PENDING_SLOW_MS = 30_000;

export function PosPrintStatusBar({ outletId }: { outletId: number | null }) {
  const { t } = useTranslation("ops");
  const health = usePrintStatusStore((s) => s.health);
  const pending = usePrintStatusStore((s) => s.pending);
  const failed = usePrintStatusStore((s) => s.failed);
  const refresh = usePrintStatusStore((s) => s.refresh);
  const retryFailed = usePrintStatusStore((s) => s.retryFailed);
  const reprintLastReceipt = usePrintStatusStore((s) => s.reprintLastReceipt);
  const lastReceiptHistoryId = usePrintStatusStore((s) => s.lastReceiptHistoryId);
  const pendingSinceRef = useRef<number | null>(null);
  const [showPendingSlowHint, setShowPendingSlowHint] = useState(false);

  useEffect(() => {
    if (!outletId || outletId < 1) return;
    void refresh(outletId);
    const timer = setInterval(() => {
      void refresh(outletId);
    }, 5000);
    return () => clearInterval(timer);
  }, [outletId, refresh]);

  useEffect(() => {
    if (health === "pending" && pending > 0) {
      if (pendingSinceRef.current === null) {
        pendingSinceRef.current = Date.now();
      }
    } else {
      pendingSinceRef.current = null;
      setShowPendingSlowHint(false);
    }
  }, [health, pending]);

  useEffect(() => {
    if (health !== "pending" || pending <= 0 || pendingSinceRef.current === null) {
      return;
    }

    const elapsed = Date.now() - pendingSinceRef.current;
    if (elapsed >= PENDING_SLOW_MS) {
      setShowPendingSlowHint(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowPendingSlowHint(true);
    }, PENDING_SLOW_MS - elapsed);

    return () => clearTimeout(timer);
  }, [health, pending]);

  if (!outletId || outletId < 1) return null;

  const healthLabel = t(`pos.printStatus.${health}`);

  return (
    <div className={`flex flex-wrap items-center gap-2 p-3 rounded-xl text-sm ${healthClass[health]}`}>
      <Printer className="h-4 w-4 shrink-0" />
      <span className="font-medium">{healthLabel}</span>
      {health === "offline" ? null : (
        <span className="text-xs opacity-80">
          {t("pos.printStatus.pendingCount", { count: pending })}
          {failed > 0 ? ` · ${t("pos.printStatus.failedCount", { count: failed })}` : ""}
        </span>
      )}
      {showPendingSlowHint ? (
        <span className="w-full text-xs opacity-90">{t("pos.printStatus.pendingSlowHint")}</span>
      ) : null}
      <div className="ml-auto flex items-center gap-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => void refresh(outletId)}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        {failed > 0 ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void retryFailed()}>
            {t("pos.printStatus.retryFailed")}
          </Button>
        ) : null}
        {lastReceiptHistoryId ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void reprintLastReceipt()}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {t("pos.printStatus.reprintLast")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
