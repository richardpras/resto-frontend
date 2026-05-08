import { apiRequest } from "./client";

type SuccessEnvelope<T> = { success?: boolean; message?: string; data?: T };

export type TerminalSyncBatchOperation = {
  fingerprint: string;
  operationType: string;
  payload?: Record<string, unknown>;
  clientOccurredAt?: string | null;
};

export type TerminalSyncBatchPayload = {
  outletId: number;
  deviceKey?: string | null;
  operations: TerminalSyncBatchOperation[];
};

export type TerminalSyncBatchResultRow = {
  fingerprint: string;
  operationType: string;
  status: string;
  syncOperationId?: number;
  outcomeSummary?: Record<string, unknown>;
  duplicateReplayHits?: number;
  recommendation?: string;
  conflict?: Record<string, string[]>;
  replayWindowError?: Record<string, string[]>;
};

export type TerminalSyncBatchResponse = {
  results: TerminalSyncBatchResultRow[];
  terminalRegistered?: boolean;
};

export async function postTerminalSyncBatch(payload: TerminalSyncBatchPayload): Promise<TerminalSyncBatchResponse> {
  const res = await apiRequest<SuccessEnvelope<TerminalSyncBatchResponse>>("/sync/operations/batch", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.data || !Array.isArray(res.data.results)) {
    throw new Error("Malformed sync batch response");
  }

  return res.data;
}
