import { healthBandColor, healthBandLabel } from "@/lib/menu-dashboard/aggregations";
import type { DashboardHealth } from "@/lib/api-integration/menuDashboardEndpoints";

type Props = {
  health: DashboardHealth | undefined;
  loading?: boolean;
};

export function HealthGauge({ health, loading }: Props) {
  const score = health?.score ?? 0;
  const band = health?.band ?? "critical";
  const color = healthBandColor(band);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          {!loading && (
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{loading ? "—" : Math.round(score)}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-semibold" style={{ color }}>{healthBandLabel(band)}</p>
        <p className="text-xs text-muted-foreground mt-1">Executive health score</p>
      </div>
      {health && (
        <ul className="text-xs text-muted-foreground space-y-1 w-full max-w-xs">
          <li>Critical alerts: −{health.penalties.criticalAlerts * 10} pts</li>
          <li>DOG items: −{health.penalties.dogItems * 2} pts</li>
          <li>Stock risks: −{health.penalties.criticalStockRisks * 5} pts</li>
          {health.penalties.foodCostAboveThreshold && <li>Food cost &gt; 40%: −10 pts</li>}
          {health.penalties.marginErosionDetected && <li>Margin erosion: −10 pts</li>}
        </ul>
      )}
    </div>
  );
}
