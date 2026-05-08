import { apiRequest } from "./client";

type SuccessEnvelope<T> = { success?: boolean; message?: string; data?: T };

export type RegisterTerminalPayload = {
  outletId: number;
  deviceKey: string;
  displayLabel?: string | null;
  capabilities?: Record<string, unknown> | null;
};

export async function registerTerminal(payload: RegisterTerminalPayload): Promise<void> {
  await apiRequest<SuccessEnvelope<unknown>>("/terminals/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type TerminalHeartbeatPayload = {
  outletId: number;
  deviceKey: string;
  sessionMetadata?: Record<string, unknown> | null;
};

export async function heartbeatTerminal(payload: TerminalHeartbeatPayload): Promise<void> {
  await apiRequest<SuccessEnvelope<unknown>>("/terminals/heartbeat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
