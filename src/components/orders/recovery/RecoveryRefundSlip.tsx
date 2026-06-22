import { useTranslation } from "react-i18next";
import type { OrderApi } from "@/lib/api-integration/endpoints";
import { formatRp, formatWhen } from "./recoveryShared";

type Props = {
  order: OrderApi;
  line: OrderApi["items"][number];
  amount: number;
  managerName?: string | null;
};

/** Minimal print-friendly refund summary (Phase 2). */
export function RecoveryRefundSlip({ order, line, amount, managerName }: Props) {
  const { t } = useTranslation("ops");

  return (
    <div
      className="rounded-lg border border-dashed border-border bg-background p-3 text-[11px] space-y-1 font-mono"
      data-testid="recovery-refund-slip"
    >
      <p className="font-bold text-center text-foreground">{t("managerRecovery.refundSlip.title", "CASH REFUND")}</p>
      <p>{t("managerRecovery.refundSlip.order", "Order")}: {order.code}</p>
      <p>{t("managerRecovery.refundSlip.line", "Line")}: {line.name}</p>
      <p>{t("managerRecovery.refundSlip.amount", "Amount")}: {formatRp(amount)}</p>
      {managerName ? <p>{t("managerRecovery.refundSlip.manager", "Manager")}: {managerName}</p> : null}
      <p className="text-muted-foreground">{formatWhen(new Date().toISOString())}</p>
    </div>
  );
}
