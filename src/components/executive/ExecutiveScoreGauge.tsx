import { Badge } from "@/components/ui/badge";
import { useErpTranslation } from "@/i18n/useErpTranslation";

type Props = {
  score: number;
  partial: boolean;
  pillarCount: number;
  loading?: boolean;
};

function scoreColor(score: number): string {
  if (score >= 80) return "hsl(142 76% 36%)";
  if (score >= 60) return "hsl(38 92% 50%)";
  if (score >= 40) return "hsl(25 95% 53%)";
  return "hsl(0 84% 60%)";
}

function scoreLabelKey(score: number): string {
  if (score >= 80) return "executive.scoreGauge.labels.healthy";
  if (score >= 60) return "executive.scoreGauge.labels.watch";
  if (score >= 40) return "executive.scoreGauge.labels.atRisk";
  return "executive.scoreGauge.labels.critical";
}

export function ExecutiveScoreGauge({ score, partial, pillarCount, loading }: Props) {
  const { t } = useErpTranslation();
  const color = scoreColor(score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-40 w-40">
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
          <span className="text-4xl font-bold">{loading ? "—" : score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold" style={{ color: loading ? undefined : color }}>
          {loading ? t("executive.scoreGauge.calculating") : t(scoreLabelKey(score))}
        </p>
        <p className="text-xs text-muted-foreground">{t("executive.scoreGauge.ownerScore")}</p>
        {partial && !loading ? (
          <Badge variant="secondary" className="text-xs">
            {t("executive.scoreGauge.partialScore", { count: pillarCount })}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
