export type KitchenConnectionStatus = "live" | "polling" | "disconnected";

export type KitchenConnectionInput = {
  realtimeConnected: boolean;
  pollingActive: boolean;
  consecutiveFetchFailures: number;
  hasBlockingError: boolean;
};

export function deriveKitchenConnectionStatus(input: KitchenConnectionInput): KitchenConnectionStatus {
  if (input.consecutiveFetchFailures >= 2 || (input.hasBlockingError && !input.pollingActive)) {
    return "disconnected";
  }
  if (input.realtimeConnected) {
    return "live";
  }
  if (input.pollingActive) {
    return "polling";
  }
  return "disconnected";
}

export const KITCHEN_CONNECTION_LABELS: Record<KitchenConnectionStatus, string> = {
  live: "Live",
  polling: "Polling",
  disconnected: "Disconnected",
};
