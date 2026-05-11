import type { PrinterQueueSummary } from "@/domain/operationsTypes";
import { apiRequest as request } from "./client";

type Envelope<T> = { data: T };
type MessageEnvelope<T> = { data: T; message?: string };

export async function listPrinterQueues(): Promise<PrinterQueueSummary[]> {
  const res = await request<Envelope<PrinterQueueSummary[]>>("/print/queue/status");
  return res.data ?? [];
}

export async function retryPrinterQueueJob(
  _printerId: string,
  jobId: string,
): Promise<{ id: string; status: "pending" | "printing" | "failed" | "done"; attempts: number }> {
  const res = await request<MessageEnvelope<{ id: string; status: "pending" | "printing" | "failed" | "done"; attempts: number }>>(
    `/print/queue/jobs/${encodeURIComponent(jobId)}/retry`,
    { method: "POST" },
  );
  return res.data;
}
