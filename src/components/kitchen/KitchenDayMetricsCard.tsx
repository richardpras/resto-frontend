import { computeKitchenDayMetrics, formatKitchenMetricValue } from "@/domain/kitchenMetrics";
import type { KitchenTicket } from "@/domain/kitchenAdapters";

type Props = {
  tickets: KitchenTicket[];
  nowMs: number;
};

export function KitchenDayMetricsCard({ tickets, nowMs }: Props) {
  const metrics = computeKitchenDayMetrics(tickets, nowMs);

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"
      data-testid="kitchen-day-metrics"
    >
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <p className="text-xs text-muted-foreground">Today&apos;s Kitchen</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Completed Today</p>
        <p className="text-2xl font-bold mt-1">{metrics.completedToday}</p>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <p className="text-xs text-muted-foreground">Average Cook Time</p>
        <p className="text-2xl font-bold mt-1">
          {formatKitchenMetricValue(metrics.averageCookTimeMinutes, " min")}
        </p>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <p className="text-xs text-muted-foreground">Longest Waiting Ticket</p>
        <p className="text-2xl font-bold mt-1">
          {formatKitchenMetricValue(metrics.longestWaitingMinutes, " min")}
        </p>
      </div>
    </div>
  );
}
