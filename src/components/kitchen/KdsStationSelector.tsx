import type { KdsStationId, KdsStationOption } from "@/hooks/useKdsStationFilter";
import { cn } from "@/lib/utils";

type Props = {
  availableStations: KdsStationOption[];
  station: KdsStationId;
  onStationChange: (station: KdsStationId) => void;
};

export function KdsStationSelector({ availableStations, station, onStationChange }: Props) {
  return (
    <div
      className="inline-flex rounded-xl border border-kds-card-border bg-kds-card p-0.5"
      data-testid="kds-station-selector"
      role="tablist"
      aria-label="Kitchen station"
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
          {opt.label}
        </button>
      ))}
    </div>
  );
}
