import { apiRequest as request } from "./client";

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
  tableOperationalStatus: "available" | "occupied" | "reserved" | "cleaning" | "disabled";
  tableOperationalSignals?: {
    openBillCount?: number;
    pendingQrRequestCount?: number;
    hasReservation?: boolean;
    isCleaning?: boolean;
    isDisabled?: boolean;
  };
};

export type QrResolvedTableApi = {
  id: number;
  outletId: number;
  tableId: number;
  tableName: string;
  qrPublicId: string | null;
  qrEnabled: boolean;
  canonicalUrl: string;
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

export async function resolveTableQrPublicId(qrPublicId: string): Promise<QrResolvedTableApi> {
  const res = await request<Envelope<QrResolvedTableApi>>(`/qr/tables/${encodeURIComponent(qrPublicId)}`);
  return res.data;
}

export async function resolveLegacyTableQr(outletId: number, tableId: number): Promise<QrResolvedTableApi> {
  const query = `outletId=${encodeURIComponent(String(outletId))}&tableId=${encodeURIComponent(String(tableId))}`;
  const res = await request<Envelope<QrResolvedTableApi>>(`/qr/legacy-resolve?${query}`);
  return res.data;
}
