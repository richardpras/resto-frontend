import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOrdersExplorerStore } from "@/stores/ordersExplorerStore";
import { formatRp } from "./recoveryShared";

type Props = {
  orderId: string;
  orderItemId: string | number;
  defaultAmount?: number;
  onComplete: () => void;
};

export function RecoveryExecuteRefundStep({ orderId, orderItemId, defaultAmount = 0, onComplete }: Props) {
  const { t } = useTranslation("ops");
  const executeRefund = useOrdersExplorerStore((s) => s.executeRefund);
  const refundExecuting = useOrdersExplorerStore((s) => s.refundExecuting);
  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : "");
  const idem = useMemo(
    () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `refund-${orderId}-${orderItemId}`),
    [orderId, orderItemId],
  );

  const submit = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(t("managerRecovery.wizard.execute.invalidAmount", "Enter a valid refund amount"));
      return;
    }
    try {
      await executeRefund(orderId, orderItemId, {
        method: "cash",
        amount: parsed,
        idempotencyKey: idem,
        notes: "Executed from Manager Recovery Wizard",
      });
      toast.success(t("managerRecovery.wizard.execute.success", "Cash refund executed"));
      onComplete();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("managerRecovery.wizard.execute.failed", "Refund failed"));
    }
  };

  return (
    <div className="space-y-2" data-testid="recovery-wizard-execute">
      <p className="text-xs font-semibold text-foreground">{t("managerRecovery.wizard.execute.title", "Execute cash refund")}</p>
      <p className="text-[10px] text-muted-foreground">
        {t("managerRecovery.wizard.execute.hint", "Creates a refund payment row and updates paid total. Give cash to the customer from the drawer.")}
      </p>
      <label className="block text-[10px] text-muted-foreground">
        {t("managerRecovery.wizard.execute.amount", "Cash amount")}
        <input
          className="mt-0.5 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px]"
          inputMode="decimal"
          value={amount}
          disabled={refundExecuting}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </label>
      {defaultAmount > 0 ? (
        <p className="text-[10px] text-muted-foreground">
          {t("managerRecovery.wizard.execute.suggested", "Suggested from settlement")}: {formatRp(defaultAmount)}
        </p>
      ) : null}
      <Button type="button" size="sm" disabled={refundExecuting} onClick={() => void submit()}>
        {t("managerRecovery.wizard.execute.submit", "Execute cash refund")}
      </Button>
    </div>
  );
}
