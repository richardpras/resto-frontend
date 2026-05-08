import type {
  HardwareBridgeCommandApi,
  HardwareBridgeDeviceApi,
  HardwareBridgeSessionApi,
} from "@/lib/api-integration/hardwareBridgeEndpoints";

export type HardwareBridgeHealthState = "online" | "offline" | "stale" | "disabled";
export type HardwareBridgeHeartbeatState = "healthy" | "delayed" | "missing";
export type HardwareBridgeReconnectState = "stable" | "reconnecting" | "recovering";
export type HardwareBridgeConnectionHint = "lan" | "bluetooth" | "unknown";
export type HardwareBridgeRuntimeState =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "stale"
  | "recovering"
  | "degraded";

export type HardwareBridgeRuntimeCapabilities = {
  transports: Array<"websocket" | "polling" | string>;
  capabilities: string[];
  spoolSupported: boolean;
};

export type HardwareBridgeSpoolHealth = {
  queueDepth: number;
  deadLetterCount: number;
  avgAckLatencyMs: number;
  retryCount: number;
};

export type HardwareBridgeProvisioningState = {
  status: string;
  pairedOutletIdentity: string | null;
  pairedDeviceIdentity: string | null;
  deviceFingerprint: string | null;
  tokenHealth: string;
  tokenRotationDue: boolean;
};

export type HardwareBridgeWatchdogState = {
  state: string;
  restartCount: number;
  crashCount: number;
  stalledSpoolDetected: boolean;
  freezeDetected: boolean;
};

export type HardwareBridgeRuntimeDeploymentState = {
  version: string;
  deploymentMode: string;
  serviceMode: string;
  trayMode: string;
  updateChannel: string;
  updateAvailable: boolean;
  updateTargetVersion: string | null;
  updateRestartRequired: boolean;
};

export type HardwareBridgeDevice = {
  id: number;
  outletId: number;
  deviceKey: string;
  displayLabel: string | null;
  status: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  disabledAt: string | null;
  reconnectCount: number;
  capabilities: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  connectionHint: HardwareBridgeConnectionHint;
};

export type HardwareBridgeSession = {
  id: number;
  outletId: number;
  deviceId: number;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
};

export type HardwareBridgeCommand = {
  id: number;
  outletId: number;
  deviceId: number;
  sessionId: number | null;
  commandType: string | null;
  status: string;
  idempotencyKey: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  deadLetteredAt: string | null;
  deduplicated: boolean;
  ackedAt: string | null;
  nackedAt: string | null;
};

function asIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function detectConnectionHint(
  metadata: Record<string, unknown> | null,
  capabilities: Record<string, unknown> | null,
): HardwareBridgeConnectionHint {
  const transportHint = metadata?.transportHints;
  if (Array.isArray(transportHint)) {
    if (transportHint.some((item) => String(item).toLowerCase().includes("bluetooth"))) return "bluetooth";
    if (transportHint.some((item) => String(item).toLowerCase().includes("lan"))) return "lan";
  }
  const transport = metadata?.transport;
  if (typeof transport === "string") {
    const normalized = transport.toLowerCase();
    if (normalized.includes("bluetooth")) return "bluetooth";
    if (normalized.includes("lan") || normalized.includes("ethernet")) return "lan";
  }
  if (capabilities?.bluetooth === true) return "bluetooth";
  if (capabilities?.lan === true || capabilities?.network === true) return "lan";
  return "unknown";
}

export function mapHardwareBridgeDeviceApiToModel(row: HardwareBridgeDeviceApi): HardwareBridgeDevice {
  const metadata = (row.metadata ?? null) as Record<string, unknown> | null;
  const capabilities = (row.capabilities ?? null) as Record<string, unknown> | null;
  return {
    id: Number(row.id),
    outletId: Number(row.outletId ?? row.outlet_id ?? 0),
    deviceKey: String(row.deviceKey ?? row.device_key ?? ""),
    displayLabel:
      typeof row.displayLabel === "string"
        ? row.displayLabel
        : typeof row.display_label === "string"
          ? row.display_label
          : null,
    status: String(row.status ?? "offline"),
    lastSeenAt: asIso(row.lastSeenAt ?? row.last_seen_at),
    revokedAt: asIso(row.revokedAt ?? row.revoked_at),
    disabledAt: asIso(row.disabledAt ?? row.disabled_at),
    reconnectCount: Number(row.reconnectCount ?? row.reconnect_count ?? 0),
    capabilities,
    metadata,
    connectionHint: detectConnectionHint(metadata, capabilities),
  };
}

export function mapHardwareBridgeSessionApiToModel(row: HardwareBridgeSessionApi): HardwareBridgeSession {
  return {
    id: Number(row.id),
    outletId: Number(row.outletId ?? row.outlet_id ?? 0),
    deviceId: Number(row.deviceId ?? row.device_id ?? 0),
    status: String(row.status ?? "unknown"),
    openedAt: asIso(row.openedAt ?? row.opened_at),
    closedAt: asIso(row.closedAt ?? row.closed_at),
  };
}

export function mapHardwareBridgeCommandApiToModel(row: HardwareBridgeCommandApi): HardwareBridgeCommand {
  return {
    id: Number(row.id),
    outletId: Number(row.outletId ?? row.outlet_id ?? 0),
    deviceId: Number(row.deviceId ?? row.device_id ?? 0),
    sessionId: row.sessionId ?? row.session_id ?? null,
    commandType:
      typeof row.commandType === "string"
        ? row.commandType
        : typeof row.command_type === "string"
          ? row.command_type
          : null,
    status: String(row.status ?? "queued"),
    idempotencyKey:
      typeof row.idempotencyKey === "string"
        ? row.idempotencyKey
        : typeof row.idempotency_key === "string"
          ? row.idempotency_key
          : null,
    retryCount: Number(row.retryCount ?? row.retry_count ?? 0),
    maxRetries: Number(row.maxRetries ?? row.max_retries ?? 0),
    nextRetryAt: asIso(row.nextRetryAt ?? row.next_retry_at),
    deadLetteredAt: asIso(row.deadLetteredAt ?? row.dead_lettered_at),
    deduplicated: Boolean(row.deduplicated),
    ackedAt: asIso(row.ackedAt ?? row.acked_at),
    nackedAt: asIso(row.nackedAt ?? row.nacked_at),
  };
}
