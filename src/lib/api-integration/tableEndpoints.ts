import { API_BASE_URL, apiRequest as request, getApiAccessToken } from "./client";

type Envelope<T> = { data: T };

export type FloorTableApi = {
  id: number;
  outletId: number;
  name: string;
  capacity: number | null;
  status: "active" | "inactive";
  qrPublicId?: string | null;
  qrEnabled?: boolean;
  qrVersion?: number;
  qrLastRotatedAt?: string | null;
  qrUrl?: string | null;
  qrStatus?: "ready" | "missing_url" | "invalid_url";
  qrStatusReason?: string | null;
  tableOperationalStatus: "available" | "occupied" | "reserved" | "cleaning" | "disabled";
  tableOperationalSignals?: {
    openBillCount?: number;
    pendingQrRequestCount?: number;
    hasReservation?: boolean;
    isCleaning?: boolean;
    isDisabled?: boolean;
  };
};

export type QrActiveSessionApi = {
  hasActiveSession: boolean;
  activeQrOrder?: {
    id: number;
    requestCode: string;
    status: string;
    customerStatus: string;
    customerStatusLabel: string;
    detailUrl: string;
  } | null;
  activePosOrder?: {
    orderId: number;
    orderCode: string;
    paymentStatus: string;
    total: number;
    kitchenStatus: string;
  } | null;
  activeOpenBill?: {
    orderId: number;
    orderCode: string;
    paymentStatus: string;
    total: number;
    kitchenStatus: string;
  } | null;
};

export type QrGuestSessionApi = {
  token: string;
  expiresAt: string;
};

export type QrResolvedTableApi = {
  id: number;
  outletId: number;
  tableId: number;
  tableName: string;
  qrPublicId: string | null;
  qrEnabled: boolean;
  canonicalUrl: string;
  activeSession?: QrActiveSessionApi;
  guestSession?: QrGuestSessionApi;
};

export type CreateFloorTablePayload = {
  outletId: number;
  name: string;
  capacity: number | null;
  status: "active" | "inactive";
  code?: string | null;
  zone?: string | null;
};

/** GET /tables?outletId=… — requires Bearer + `tables.view` */
export async function listFloorTables(outletId: number): Promise<FloorTableApi[]> {
  const res = await request<Envelope<FloorTableApi[]>>(`/tables?outletId=${encodeURIComponent(String(outletId))}`);
  return res.data;
}

type MessageEnvelope<T> = { message: string; data: T };

export async function createFloorTable(body: CreateFloorTablePayload): Promise<FloorTableApi> {
  const res = await request<MessageEnvelope<FloorTableApi>>("/tables", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function updateFloorTable(
  tableId: number,
  patch: Partial<Pick<FloorTableApi, "name" | "capacity" | "status">>,
): Promise<FloorTableApi> {
  const res = await request<MessageEnvelope<FloorTableApi>>(`/tables/${encodeURIComponent(String(tableId))}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return res.data;
}

export async function deleteFloorTable(tableId: number): Promise<void> {
  await request<{ message?: string }>(`/tables/${encodeURIComponent(String(tableId))}`, {
    method: "DELETE",
  });
}

export async function generateTableQr(tableId: number): Promise<FloorTableApi> {
  const res = await request<MessageEnvelope<FloorTableApi>>(`/tables/${encodeURIComponent(String(tableId))}/qr/generate`, {
    method: "POST",
  });
  return res.data;
}

export async function rotateTableQr(tableId: number): Promise<FloorTableApi> {
  const res = await request<MessageEnvelope<FloorTableApi>>(`/tables/${encodeURIComponent(String(tableId))}/qr/rotate`, {
    method: "POST",
  });
  return res.data;
}

export async function enableTableQr(tableId: number): Promise<FloorTableApi> {
  const res = await request<MessageEnvelope<FloorTableApi>>(`/tables/${encodeURIComponent(String(tableId))}/qr/enable`, {
    method: "POST",
  });
  return res.data;
}

export async function disableTableQr(tableId: number): Promise<FloorTableApi> {
  const res = await request<MessageEnvelope<FloorTableApi>>(`/tables/${encodeURIComponent(String(tableId))}/qr/disable`, {
    method: "POST",
  });
  return res.data;
}

export async function resolveTableQrPublicId(
  qrPublicId: string,
  options?: { guestSessionToken?: string | null },
): Promise<QrResolvedTableApi> {
  const headers: Record<string, string> = {};
  if (options?.guestSessionToken) {
    headers["X-Qr-Guest-Session"] = options.guestSessionToken;
  }
  const res = await request<Envelope<QrResolvedTableApi>>(`/qr/tables/${encodeURIComponent(qrPublicId)}`, {
    headers,
  });
  return res.data;
}

export async function resolveLegacyTableQr(
  outletId: number,
  tableId: number,
  options?: { guestSessionToken?: string | null },
): Promise<QrResolvedTableApi> {
  const query = `outletId=${encodeURIComponent(String(outletId))}&tableId=${encodeURIComponent(String(tableId))}`;
  const headers: Record<string, string> = {};
  if (options?.guestSessionToken) {
    headers["X-Qr-Guest-Session"] = options.guestSessionToken;
  }
  const res = await request<Envelope<QrResolvedTableApi>>(`/qr/legacy-resolve?${query}`, { headers });
  return res.data;
}

export type TableQrDetailApi = {
  tableId: number;
  tableName: string;
  qrPublicId: string | null;
  qrUrl: string | null;
  qrImageUrl: string | null;
  qrStatus: "ready" | "missing_url" | "invalid_url";
  qrStatusReason: string | null;
};

export async function getTableQrDetail(tableId: number): Promise<TableQrDetailApi> {
  const res = await request<Envelope<TableQrDetailApi>>(`/tables/${encodeURIComponent(String(tableId))}/qr`);
  return res.data;
}

export function tableQrImageUrl(tableId: number): string {
  return `${API_BASE_URL}/tables/${encodeURIComponent(String(tableId))}/qr/image`;
}

export async function fetchTableQrImageBlob(tableId: number): Promise<Blob> {
  const token = getApiAccessToken();
  const response = await fetch(tableQrImageUrl(tableId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Failed to load QR image.");
  }
  return response.blob();
}

export async function regenerateTableQr(tableId: number): Promise<FloorTableApi> {
  const res = await request<MessageEnvelope<FloorTableApi>>(`/tables/${encodeURIComponent(String(tableId))}/qr/regenerate`, {
    method: "POST",
  });
  return res.data;
}

export async function exportTableQrPdf(outletId: number, tableIds: number[]): Promise<Blob> {
  const params = new URLSearchParams({ outletId: String(outletId) });
  for (const id of tableIds) {
    params.append("tableIds[]", String(id));
  }
  const token = getApiAccessToken();
  const response = await fetch(`${API_BASE_URL}/tables/qr/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Failed to export QR PDF.");
  }
  return response.blob();
}
