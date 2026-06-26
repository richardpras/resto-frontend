import { computeKitchenDayMetrics, formatKitchenMetricValue } from "@/domain/kitchenMetrics";
import type { KitchenTicket } from "@/domain/kitchenAdapters";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

type Props = {
  tickets: KitchenTicket[];
  nowMs: number;
};

export function KdsMetricsStrip({ tickets, nowMs }: Props) {
  const { t } = useOpsTranslation();
  const metrics = computeKitchenDayMetrics(tickets, nowMs);
  const minSuffix = t("kitchen.metrics.minutesSuffix");

  return (
    <div
      className="shrink-0 grid grid-cols-3 gap-2 sm:gap-4 max-h-[80px] mb-3"
      data-testid="kitchen-day-metrics"
    >
      <MetricCell label={t("kitchen.metrics.completedToday")} value={String(metrics.completedToday)} />
      <MetricCell
        label={t("kitchen.metrics.avgCookTime")}
        value={formatKitchenMetricValue(metrics.averageCookTimeMinutes, minSuffix)}
      />
      <MetricCell
        label={t("kitchen.metrics.longestWaiting")}
        value={formatKitchenMetricValue(metrics.longestWaitingMinutes, minSuffix)}
        data-testid="kds-longest-waiting"
      />
    </div>
  );
}

function MetricCell({
  label,
  value,
  ...rest
}: {
  label: string;
  value: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="rounded-xl border border-kds-card-border bg-kds-card/80 px-3 py-2 flex flex-col justify-center min-h-0 overflow-hidden"
      {...rest}
    >
      <p className="text-[10px] sm:text-xs uppercase tracking-wide text-kds-muted-fg truncate">{label}</p>
      <p className="text-lg sm:text-2xl font-extrabold text-kds-fg tabular-nums leading-tight truncate">{value}</p>
    </div>
  );
}
