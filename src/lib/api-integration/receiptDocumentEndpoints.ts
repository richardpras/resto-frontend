import type { ReceiptRenderHistoryRow } from "@/domain/receiptDocumentTypes";
import { API_BASE_URL, apiRequest, ApiHttpError, getApiAccessToken } from "./client";

type SuccessEnvelope<T> = { success?: boolean; data: T; message?: string };

export async function listReceiptRenderHistory(
  outletId: number,
  filters?: { sourceType?: string; sourceId?: number },
): Promise<ReceiptRenderHistoryRow[]> {
  const params = new URLSearchParams({ outletId: String(outletId) });
  if (filters?.sourceType) params.set("sourceType", filters.sourceType);
  if (typeof filters?.sourceId === "number") params.set("sourceId", String(filters.sourceId));
  const res = await apiRequest<SuccessEnvelope<ReceiptRenderHistoryRow[]>>(`/print/documents/history?${params}`);
  return res.data ?? [];
}

export async function getReceiptRenderHistory(historyId: number): Promise<ReceiptRenderHistoryRow> {
  const res = await apiRequest<SuccessEnvelope<ReceiptRenderHistoryRow>>(`/print/documents/${historyId}`);
  return res.data;
}

export async function renderReceiptDocument(body: Record<string, unknown>): Promise<ReceiptRenderHistoryRow> {
  const res = await apiRequest<SuccessEnvelope<ReceiptRenderHistoryRow>>("/print/documents/render", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function postCashierSessionReceiptSummary(body: Record<string, unknown>): Promise<ReceiptRenderHistoryRow> {
  const res = await apiRequest<SuccessEnvelope<ReceiptRenderHistoryRow>>("/print/documents/cashier-session-summary", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function postReceiptReprint(
  historyId: number,
  reason?: string,
): Promise<{ printJobId: number; render: ReceiptRenderHistoryRow }> {
  const res = await apiRequest<SuccessEnvelope<{ printJobId: number; render: ReceiptRenderHistoryRow }>>(
    `/print/documents/${historyId}/reprint`,
    {
      method: "POST",
      body: JSON.stringify({ reason: reason ?? null }),
    },
  );
  return res.data;
}

export async function postReceiptDeferReplay(historyId: number): Promise<ReceiptRenderHistoryRow> {
  const res = await apiRequest<SuccessEnvelope<ReceiptRenderHistoryRow>>(`/print/documents/${historyId}/defer`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return res.data;
}

/** Binary PDF GET (not JSON envelope). */
export async function fetchReceiptPdfBlob(historyId: number): Promise<Blob> {
  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}/print/documents/${historyId}/pdf`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Request failed (${response.status})`;
    throw new ApiHttpError(response.status, message, body);
  }
  if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
    const text = await response.text().catch(() => "");
    throw new ApiHttpError(response.status, `Expected PDF, got ${contentType || "unknown"}`, text);
  }
  return response.blob();
}
