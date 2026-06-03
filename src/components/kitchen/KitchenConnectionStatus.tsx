import {
  deriveKitchenConnectionStatus,
  KITCHEN_CONNECTION_LABELS,
  type KitchenConnectionStatus,
} from "@/domain/kitchenConnectionStatus";

type Props = {
  realtimeConnected: boolean;
  pollingActive: boolean;
  consecutiveFetchFailures: number;
  hasBlockingError: boolean;
};

const STATUS_DOT: Record<KitchenConnectionStatus, string> = {
  live: "bg-success",
  polling: "bg-warning",
  disconnected: "bg-destructive",
};

export function KitchenConnectionStatus({
  realtimeConnected,
  pollingActive,
  consecutiveFetchFailures,
  hasBlockingError,
}: Props) {
  const status = deriveKitchenConnectionStatus({
    realtimeConnected,
    pollingActive,
    consecutiveFetchFailures,
    hasBlockingError,
  });

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border border-border/50 bg-card"
      data-testid="kitchen-connection-status"
      data-connection-status={status}
    >
      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
      {KITCHEN_CONNECTION_LABELS[status]}
    </span>
  );
}
