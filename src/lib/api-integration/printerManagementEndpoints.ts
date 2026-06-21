import type { PrinterQueueSummary } from "@/domain/operationsTypes";
import { apiRequest as request } from "./client";

type Envelope<T> = { data: T };
type MessageEnvelope<T> = { data: T; message?: string };

export type PrinterQueueStatusResponse = {
  outletId: number;
  dispatchMode?: "queue_worker" | "sync_dispatch" | "scheduled_dispatch";
  pending: number;
  failed: number;
  retried?: number;
  recoverable?: number;
  deadLetter?: number;
  awaitingAck: number;
  doneToday: number;
  bridgeConnected: boolean;
  printerOnline: boolean;
  queues: PrinterQueueSummary[];
};

export async function listPrinterQueueStatus(outletId: number): Promise<PrinterQueueStatusResponse> {
  const res = await request<Envelope<PrinterQueueStatusResponse>>(`/print/queue/status?outletId=${outletId}`);
  return res.data;
}

/** @deprecated use listPrinterQueueStatus */
export async function listPrinterQueues(outletId?: number): Promise<PrinterQueueSummary[]> {
  if (!outletId || outletId < 1) return [];
  const status = await listPrinterQueueStatus(outletId);
  return status.queues ?? [];
}

export async function retryPrinterQueueJob(
  _printerId: string,
  jobId: string,
  outletId?: number,
): Promise<{ id: string; status: "pending" | "printing" | "failed" | "done"; attempts: number }> {
  const res = await request<MessageEnvelope<{ id: string; status: "pending" | "printing" | "failed" | "done"; attempts: number }>>(
    `/print/queue/jobs/${encodeURIComponent(jobId)}/retry`,
    {
      method: "POST",
      body: JSON.stringify({ outletId }),
    },
  );
  return res.data;
}
