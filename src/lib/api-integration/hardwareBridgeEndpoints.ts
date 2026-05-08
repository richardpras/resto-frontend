import { apiRequest as request } from "./client";

type Envelope<T> = { data: T };

export type HardwareBridgeDeviceApi = {
  id: number | string;
  outletId?: number;
  outlet_id?: number;
  deviceKey?: string;
  device_key?: string;
  displayLabel?: string | null;
  display_label?: string | null;
  status?: string;
  lastSeenAt?: string | null;
  last_seen_at?: string | null;
  revokedAt?: string | null;
  revoked_at?: string | null;
  disabledAt?: string | null;
  disabled_at?: string | null;
  reconnectCount?: number;
  reconnect_count?: number;
  capabilities?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type HardwareBridgeSessionApi = {
  id: number | string;
  outletId?: number;
  outlet_id?: number;
  deviceId?: number;
  device_id?: number;
  status?: string;
  openedAt?: string | null;
  opened_at?: string | null;
  closedAt?: string | null;
  closed_at?: string | null;
};

export type HardwareBridgeCommandApi = {
  id: number | string;
  outletId?: number;
  outlet_id?: number;
  deviceId?: number;
  device_id?: number;
  sessionId?: number | null;
  session_id?: number | null;
  commandType?: string;
  command_type?: string;
  status?: string;
  idempotencyKey?: string;
  idempotency_key?: string;
  retryCount?: number;
  retry_count?: number;
  maxRetries?: number;
  max_retries?: number;
  nextRetryAt?: string | null;
  next_retry_at?: string | null;
  deadLetteredAt?: string | null;
  dead_lettered_at?: string | null;
  deduplicated?: boolean;
  ackedAt?: string | null;
  acked_at?: string | null;
  nackedAt?: string | null;
  nacked_at?: string | null;
};

export type RegisterHardwareBridgeDevicePayload = {
  outletId: number;
  deviceKey: string;
  displayLabel?: string;
  capabilities?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type HardwareBridgeHeartbeatPayload = {
  outletId: number;
  deviceKey: string;
  sessionId?: number;
  status?: "online" | "offline" | "stale";
  metadata?: Record<string, unknown>;
};

export type OpenHardwareBridgeSessionPayload = {
  outletId: number;
  deviceKey: string;
  metadata?: Record<string, unknown>;
};

export type CloseHardwareBridgeSessionPayload = {
  reason?: string;
  metadata?: Record<string, unknown>;
};

export type EnqueueHardwareBridgeCommandPayload = {
  outletId: number;
  deviceKey: string;
  sessionId?: number;
  commandType: string;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
};

export type HardwareBridgeCommandAckPayload = {
  ackPayload?: Record<string, unknown>;
};

export async function listHardwareBridgeDevices(outletId: number): Promise<HardwareBridgeDeviceApi[]> {
  const query = new URLSearchParams({ outletId: String(outletId) });
  const response = await request<Envelope<HardwareBridgeDeviceApi[]>>(`/hardware/devices?${query.toString()}`);
  return response.data ?? [];
}

export async function registerHardwareBridgeDevice(
  payload: RegisterHardwareBridgeDevicePayload,
): Promise<HardwareBridgeDeviceApi> {
  const response = await request<Envelope<HardwareBridgeDeviceApi>>("/hardware/devices/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function heartbeatHardwareBridgeDevice(
  payload: HardwareBridgeHeartbeatPayload,
): Promise<HardwareBridgeDeviceApi> {
  const response = await request<Envelope<HardwareBridgeDeviceApi>>("/hardware/devices/heartbeat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function openHardwareBridgeSession(
  payload: OpenHardwareBridgeSessionPayload,
): Promise<HardwareBridgeSessionApi> {
  const response = await request<Envelope<HardwareBridgeSessionApi>>("/hardware/sessions/open", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function closeHardwareBridgeSession(
  sessionId: number,
  payload: CloseHardwareBridgeSessionPayload = {},
): Promise<HardwareBridgeSessionApi> {
  const response = await request<Envelope<HardwareBridgeSessionApi>>(`/hardware/sessions/${sessionId}/close`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function enqueueHardwareBridgeCommand(
  payload: EnqueueHardwareBridgeCommandPayload,
): Promise<HardwareBridgeCommandApi> {
  const response = await request<Envelope<HardwareBridgeCommandApi>>("/hardware/commands/enqueue", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function ackHardwareBridgeCommand(
  commandId: number,
  payload: HardwareBridgeCommandAckPayload = {},
): Promise<HardwareBridgeCommandApi> {
  const response = await request<Envelope<HardwareBridgeCommandApi>>(`/hardware/commands/${commandId}/ack`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function nackHardwareBridgeCommand(
  commandId: number,
  payload: HardwareBridgeCommandAckPayload = {},
): Promise<HardwareBridgeCommandApi> {
  const response = await request<Envelope<HardwareBridgeCommandApi>>(`/hardware/commands/${commandId}/nack`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}
