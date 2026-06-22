import { useTranslation } from "react-i18next";
import type { OrderApi, OrderItemRecoveryEventApi } from "@/lib/api-integration/endpoints";
import { formatRp, formatWhen, recoveryStatusChipClass } from "./recoveryShared";

type Props = {
  order: OrderApi;
  line: OrderApi["items"][number];
  events: OrderItemRecoveryEventApi[];
};

export function RecoveryReviewStep({ order, line, events }: Props) {
  const { t } = useTranslation("ops");
  const lineId = String(line.orderItemId ?? line.id);
  const lineEvents = events.filter((ev) => String(ev.orderItemId) === lineId);

  return (
    <div className="space-y-3" data-testid="recovery-wizard-review">
      <p className="text-xs font-semibold text-foreground">{t("managerRecovery.wizard.review.title", "Review escalation")}</p>
      <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-[11px] space-y-1">
        <p className="font-medium text-foreground">{line.name}</p>
        <p className="text-muted-foreground">
          {t("managerRecovery.wizard.review.line", "Line")} #{lineId} · ×{line.qty} · {formatRp(line.price)}
        </p>
        <p className="text-muted-foreground">
          {t("managerRecovery.wizard.review.order", "Order")} {order.code} · {order.paymentStatus}
        </p>
        {line.recoveryReason ? (
          <p className="text-amber-900 dark:text-amber-100">
            {t("managerRecovery.wizard.review.reason", "Cashier reason")}: {line.recoveryReason}
          </p>
        ) : null}
        {line.recoveryStatus ? (
          <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${recoveryStatusChipClass(line.recoveryStatus)}`}>
            {String(line.recoveryStatus).replace(/_/g, " ")}
          </span>
        ) : null}
      </div>
      {lineEvents.length > 0 ? (
        <ul className="space-y-1 max-h-32 overflow-y-auto">
          {lineEvents.map((ev) => (
            <li key={ev.id} className="text-[10px] text-muted-foreground border-l-2 border-border pl-2">
              {ev.eventCode.replace(/_/g, " ")} · {formatWhen(ev.createdAt)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-muted-foreground">{t("managerRecovery.wizard.review.noEvents", "No prior recovery events for this line.")}</p>
      )}
    </div>
  );
}
