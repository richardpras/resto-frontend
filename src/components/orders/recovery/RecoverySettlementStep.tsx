import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOrdersExplorerStore } from "@/stores/ordersExplorerStore";
import { formatRp } from "./recoveryShared";

type Props = {
  orderId: string;
  orderItemId: string | number;
  paymentStatus: string;
  onComplete: () => void;
};

export function RecoverySettlementStep({ orderId, orderItemId, paymentStatus, onComplete }: Props) {
  const { t } = useTranslation("ops");
  const previewRecoverySettlement = useOrdersExplorerStore((s) => s.previewRecoverySettlement);
  const recordRecoverySettlement = useOrdersExplorerStore((s) => s.recordRecoverySettlement);
  const recoverySettlementSubmitting = useOrdersExplorerStore((s) => s.recoverySettlementSubmitting);
  const [partial, setPartial] = useState("");
  const [credit, setCredit] = useState("");
  const [gift, setGift] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const idem = useMemo(
    () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `idem-${orderId}-${orderItemId}`),
    [orderId, orderItemId],
  );

  if (paymentStatus !== "paid" && paymentStatus !== "partial") {
    return (
      <p className="text-[10px] text-muted-foreground">
        {t("managerRecovery.wizard.settle.unpaidHint", "Settlement preview applies once the order is paid or partially paid.")}
      </p>
    );
  }

  const runPreview = async () => {
    try {
      const data = await previewRecoverySettlement(orderId, orderItemId, {
        settlementKind: "composite",
        partialRefundAmount: Number(partial) || 0,
        storeCreditAmount: Number(credit) || 0,
        giftCardAmount: Number(gift) || 0,
      });
      setPreview(data as Record<string, unknown>);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    }
  };

  const runRecord = async () => {
    try {
      await recordRecoverySettlement(orderId, orderItemId, {
        settlementKind: "composite",
        partialRefundAmount: Number(partial) || 0,
        storeCreditAmount: Number(credit) || 0,
        giftCardAmount: Number(gift) || 0,
        idempotencyKey: idem,
        notes: "Recorded from Manager Recovery Wizard",
      });
      toast.success(t("managerRecovery.wizard.settle.recorded", "Settlement audit recorded"));
      onComplete();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Record failed");
    }
  };

  const refundCapped =
    preview && typeof preview.refund === "object" && preview.refund !== null
      ? Number((preview.refund as { capped?: unknown }).capped ?? 0)
      : null;

  return (
    <div className="space-y-2" data-testid="recovery-wizard-settle">
      <p className="text-xs font-semibold text-foreground">{t("managerRecovery.wizard.settle.title", "Settlement (audit)")}</p>
      <p className="text-[10px] text-muted-foreground leading-snug">
        {t(
          "managerRecovery.wizard.settle.auditOnly",
          "Records the manager decision for audit. Cash leaves the drawer only after Execute refund (next step).",
        )}
      </p>
      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <label className="text-muted-foreground">
          {t("managerRecovery.wizard.settle.refund", "Refund")}
          <input className="mt-0.5 w-full rounded border border-border/60 bg-background px-1 py-1 text-[10px]" inputMode="decimal" value={partial} onChange={(e) => setPartial(e.target.value)} placeholder="0" />
        </label>
        <label className="text-muted-foreground">
          {t("managerRecovery.wizard.settle.storeCredit", "Store credit")}
          <input className="mt-0.5 w-full rounded border border-border/60 bg-background px-1 py-1 text-[10px]" inputMode="decimal" value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="0" />
        </label>
        <label className="text-muted-foreground">
          {t("managerRecovery.wizard.settle.giftCard", "Gift card")}
          <input className="mt-0.5 w-full rounded border border-border/60 bg-background px-1 py-1 text-[10px]" inputMode="decimal" value={gift} onChange={(e) => setGift(e.target.value)} placeholder="0" />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" disabled={recoverySettlementSubmitting} onClick={() => void runPreview()}>
          {t("managerRecovery.wizard.settle.preview", "Preview impact")}
        </Button>
        <Button type="button" size="sm" className="h-7 text-[10px]" disabled={recoverySettlementSubmitting} onClick={() => void runRecord()}>
          {t("managerRecovery.wizard.settle.record", "Record audit")}
        </Button>
      </div>
      {refundCapped != null && !Number.isNaN(refundCapped) ? (
        <p className="text-[10px] text-muted-foreground">
          {t("managerRecovery.wizard.settle.cap", "Refund cap (safe)")}: <span className="font-semibold text-foreground">{formatRp(refundCapped)}</span>
        </p>
      ) : null}
    </div>
  );
}
