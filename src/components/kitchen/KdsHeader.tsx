import { Maximize2, Minimize2 } from "lucide-react";
import { KitchenConnectionStatus } from "@/components/kitchen/KitchenConnectionStatus";
import { KdsFocusModeToggle } from "@/components/kitchen/KdsFocusModeToggle";
import { KdsStationSelector } from "@/components/kitchen/KdsStationSelector";
import type { KdsFocusMode } from "@/hooks/useKdsFocusMode";
import type { KdsStationId, KdsStationOption } from "@/hooks/useKdsStationFilter";

type Props = {
  outletName: string | null;
  nowMs: number;
  isFullscreen: boolean;
  focusMode: KdsFocusMode;
  onFocusModeChange: (mode: KdsFocusMode) => void;
  onToggleFullscreen: () => void;
  realtimeConnected: boolean;
  pollingActive: boolean;
  consecutiveFetchFailures: number;
  hasBlockingError: boolean;
  stationSelectorVisible: boolean;
  availableStations: KdsStationOption[];
  station: KdsStationId;
  onStationChange: (station: KdsStationId) => void;
};

function formatKdsClock(nowMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(nowMs));
}

export function KdsHeader({
  outletName,
  nowMs,
  isFullscreen,
  focusMode,
  onFocusModeChange,
  onToggleFullscreen,
  realtimeConnected,
  pollingActive,
  consecutiveFetchFailures,
  hasBlockingError,
  stationSelectorVisible,
  availableStations,
  station,
  onStationChange,
}: Props) {
  return (
    <header
      className="shrink-0 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-kds-card-border"
      data-testid="kds-header"
    >
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-kds-fg">Kitchen Display</h1>
        <p className="text-sm sm:text-base text-kds-muted-fg truncate" data-testid="kds-outlet-name">
          {outletName ?? "No outlet selected"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {stationSelectorVisible ? (
          <KdsStationSelector
            availableStations={availableStations}
            station={station}
            onStationChange={onStationChange}
          />
        ) : null}
        <KdsFocusModeToggle focusMode={focusMode} onFocusModeChange={onFocusModeChange} />
        <p
          className="text-lg sm:text-xl font-bold tabular-nums text-kds-fg px-2"
          data-testid="kds-clock"
          aria-live="polite"
        >
          {formatKdsClock(nowMs)}
        </p>
        <KitchenConnectionStatus
          realtimeConnected={realtimeConnected}
          pollingActive={pollingActive}
          consecutiveFetchFailures={consecutiveFetchFailures}
          hasBlockingError={hasBlockingError}
        />
        <button
          type="button"
          data-testid="kitchen-fullscreen-toggle"
          onClick={onToggleFullscreen}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-kds-card-border bg-kds-card text-sm font-semibold text-kds-fg hover:bg-kds-muted transition-colors min-h-[44px]"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>
    </header>
  );
}
