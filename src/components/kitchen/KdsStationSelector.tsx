import type { KdsStationId, KdsStationOption } from "@/hooks/useKdsStationFilter";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import { cn } from "@/lib/utils";

type Props = {
  availableStations: KdsStationOption[];
  station: KdsStationId;
  onStationChange: (station: KdsStationId) => void;
};

export function KdsStationSelector({ availableStations, station, onStationChange }: Props) {
  const { t } = useOpsTranslation();

  return (
    <div
      className="inline-flex rounded-xl border border-kds-card-border bg-kds-card p-0.5"
      data-testid="kds-station-selector"
      role="tablist"
      aria-label={t("kitchen.stationAria")}
    >
      {availableStations.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={station === opt.id}
          data-testid={`kds-station-${opt.id}`}
          onClick={() => onStationChange(opt.id)}
          className={cn(
            "px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold min-h-[40px] transition-colors",
            station === opt.id
              ? "bg-kds-accent text-kds-accent-fg"
              : "text-kds-muted-fg hover:text-kds-fg",
          )}
        >
          {opt.id === "all" ? t("kitchen.stationAll") : opt.label}
        </button>
      ))}
    </div>
  );
}
