import { apiRequest as request } from "./client";

type Envelope<T> = { data: T };

export type FloorTableApi = {
  id: number;
  outletId: number;
  name: string;
  capacity: number | null;
  status: "active" | "inactive";
};

/** GET /tables?outletId=… — requires Bearer + `tables.view` */
export async function listFloorTables(outletId: number): Promise<FloorTableApi[]> {
  const res = await request<Envelope<FloorTableApi[]>>(`/tables?outletId=${encodeURIComponent(String(outletId))}`);
  return res.data;
}

type MessageEnvelope<T> = { message: string; data: T };

export async function createFloorTable(body: Omit<FloorTableApi, "id">): Promise<FloorTableApi> {
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
