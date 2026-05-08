import type { PrinterQueueSummary } from "@/domain/operationsTypes";
import { apiRequest as request } from "./client";

type Envelope<T> = { data: T };
type MessageEnvelope<T> = { data: T; message?: string };

export async function listPrinterQueues(): Promise<PrinterQueueSummary[]> {
  const res = await request<Envelope<PrinterQueueSummary[]>>("/printers/queue");
  return res.data ?? [];
}

export async function retryPrinterQueueJob(
  printerId: string,
  jobId: string,
): Promise<{ id: string; status: "pending" | "printing" | "failed" | "done"; attempts: number }> {
  const res = await request<MessageEnvelope<{ id: string; status: "pending" | "printing" | "failed" | "done"; attempts: number }>>(
    `/printers/${encodeURIComponent(printerId)}/queue/${encodeURIComponent(jobId)}/retry`,
    { method: "POST" },
  );
  return res.data;
}
