import type { EngineeringMatrixItem } from "@/lib/api-integration/menuDashboardEndpoints";
import { resolvePresetRange } from "@/lib/reporting/dateRangePresets";

export type QuadrantKey = "STAR" | "PUZZLE" | "PLOWHORSE" | "DOG";

export type QuadrantStats = {
  count: number;
  totalMargin: number;
  estimatedRevenue: number;
};

export function aggregateQuadrants(items: EngineeringMatrixItem[]): Record<QuadrantKey, QuadrantStats> {
  const base: Record<QuadrantKey, QuadrantStats> = {
    STAR: { count: 0, totalMargin: 0, estimatedRevenue: 0 },
    PUZZLE: { count: 0, totalMargin: 0, estimatedRevenue: 0 },
    PLOWHORSE: { count: 0, totalMargin: 0, estimatedRevenue: 0 },
    DOG: { count: 0, totalMargin: 0, estimatedRevenue: 0 },
  };

  for (const item of items) {
    const key = item.classification as QuadrantKey;
    if (!base[key]) continue;
    const qty = item.quantitySold ?? 0;
    const unitMargin = item.contributionMargin ?? 0;
    const marginPct = item.marginPercent ?? 0;
    const lineMargin = unitMargin * qty;
    const lineRevenue = marginPct > 0 ? (unitMargin / (marginPct / 100)) * qty : 0;

    base[key].count += 1;
    base[key].totalMargin += lineMargin;
    base[key].estimatedRevenue += lineRevenue;
  }

  return base;
}

export function healthBandLabel(band: string): string {
  switch (band) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "warning":
      return "Warning";
    default:
      return "Critical";
  }
}

export function healthBandColor(band: string): string {
  switch (band) {
    case "excellent":
      return "hsl(var(--chart-2))";
    case "good":
      return "hsl(var(--primary))";
    case "warning":
      return "hsl(var(--chart-4))";
    default:
      return "hsl(var(--destructive))";
  }
}

export function dateRangeLastDays(days: number): { fromDate: string; toDate: string } {
  const preset = days === 7 ? "7d" : days === 14 ? "14d" : days === 30 ? "30d" : days === 1 ? "today" : "30d";
  const range =
    preset === "30d" && days !== 30
      ? (() => {
          const to = new Date();
          const from = new Date();
          from.setDate(from.getDate() - (days - 1));
          return { startDate: from.toISOString().slice(0, 10), endDate: to.toISOString().slice(0, 10) };
        })()
      : resolvePresetRange(preset);
  return { fromDate: range.startDate, toDate: range.endDate };
}
