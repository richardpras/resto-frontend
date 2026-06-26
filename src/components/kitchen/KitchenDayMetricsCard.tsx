import { computeKitchenDayMetrics, formatKitchenMetricValue } from "@/domain/kitchenMetrics";
import type { KitchenTicket } from "@/domain/kitchenAdapters";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

type Props = {
  tickets: KitchenTicket[];
  nowMs: number;
};

export function KitchenDayMetricsCard({ tickets, nowMs }: Props) {
  const { t } = useOpsTranslation();
  const metrics = computeKitchenDayMetrics(tickets, nowMs);
  const minSuffix = t("kitchen.metrics.minutesSuffix");

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"
      data-testid="kitchen-day-metrics"
    >
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <p className="text-xs text-muted-foreground">{t("kitchen.metrics.todayKitchen")}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{t("kitchen.metrics.completedToday")}</p>
        <p className="text-2xl font-bold mt-1">{metrics.completedToday}</p>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <p className="text-xs text-muted-foreground">{t("kitchen.metrics.avgCookTime")}</p>
        <p className="text-2xl font-bold mt-1">
          {formatKitchenMetricValue(metrics.averageCookTimeMinutes, minSuffix)}
        </p>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <p className="text-xs text-muted-foreground">{t("kitchen.metrics.longestWaitingTicket")}</p>
        <p className="text-2xl font-bold mt-1">
          {formatKitchenMetricValue(metrics.longestWaitingMinutes, minSuffix)}
        </p>
      </div>
    </div>
  );
}
