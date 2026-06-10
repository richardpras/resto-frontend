export type SeverityLevel = "healthy" | "info" | "warning" | "high" | "critical";

export function severityToScore(severity?: string | null): number {
  const normalized = (severity ?? "").toLowerCase();
  if (normalized === "healthy" || normalized === "info") return 100;
  if (normalized === "warning") return 75;
  if (normalized === "high") return 50;
  if (normalized === "critical") return 25;
  return 75;
}

/** Maps food cost % from API to a display score (does not recalculate food cost). */
export function foodCostPercentToScore(percent: number): number {
  if (percent <= 35) return 100;
  if (percent <= 40) return 75;
  if (percent <= 45) return 50;
  return 25;
}

export function menuAlertStatusToScore(openAlerts: number, criticalAlerts: number): number {
  if (criticalAlerts > 0) return 25;
  if (openAlerts > 0) return 50;
  return 100;
}

export function criticalAlertCountToScore(count: number): number {
  if (count <= 0) return 100;
  if (count <= 2) return 75;
  if (count <= 5) return 50;
  return 25;
}

export type ExecutiveScoreResult = {
  score: number;
  partial: boolean;
  pillarCount: number;
  weights: {
    financial: number;
    operations: number;
    commercial: number;
    alerts: number;
  };
};

const WEIGHTS = {
  financial: 0.4,
  operations: 0.3,
  commercial: 0.2,
  alerts: 0.1,
} as const;

export function computeExecutiveScore(pillars: {
  financial?: number | null;
  operations?: number | null;
  commercial?: number | null;
  alerts?: number | null;
}): ExecutiveScoreResult {
  const entries: Array<{ weight: number; score: number }> = [];

  if (typeof pillars.financial === "number") {
    entries.push({ weight: WEIGHTS.financial, score: pillars.financial });
  }
  if (typeof pillars.operations === "number") {
    entries.push({ weight: WEIGHTS.operations, score: pillars.operations });
  }
  if (typeof pillars.commercial === "number") {
    entries.push({ weight: WEIGHTS.commercial, score: pillars.commercial });
  }
  if (typeof pillars.alerts === "number") {
    entries.push({ weight: WEIGHTS.alerts, score: pillars.alerts });
  }

  if (entries.length === 0) {
    return { score: 0, partial: true, pillarCount: 0, weights: { ...WEIGHTS } };
  }

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const weighted = entries.reduce((sum, entry) => sum + entry.score * entry.weight, 0);
  const score = Math.round(weighted / totalWeight);

  return {
    score,
    partial: entries.length < 4,
    pillarCount: entries.length,
    weights: { ...WEIGHTS },
  };
}

export function computeCommercialPillarScore(
  foodCostPercent: number | null | undefined,
  openMenuAlerts: number | null | undefined,
  criticalMenuAlerts: number | null | undefined,
): number | null {
  const parts: number[] = [];
  if (typeof foodCostPercent === "number") {
    parts.push(foodCostPercentToScore(foodCostPercent));
  }
  if (typeof openMenuAlerts === "number" || typeof criticalMenuAlerts === "number") {
    parts.push(menuAlertStatusToScore(openMenuAlerts ?? 0, criticalMenuAlerts ?? 0));
  }
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}
