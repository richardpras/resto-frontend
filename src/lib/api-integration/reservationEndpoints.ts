import { apiRequest as request } from "./client";

type Envelope<T> = { data: T };
type MessageEnvelope<T> = { message: string; data: T };

export type ReservationApi = {
  id: number;
  outletId: number;
  tableId: number | null;
  reservationCode: string;
  customerName: string;
  customerPhone: string | null;
  memberId: number | null;
  memberNo?: string | null;
  memberName?: string | null;
  partySize: number;
  reservationAt: string;
  confirmedAt: string | null;
  checkedInAt: string | null;
  seatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  linkedOrderId: number | null;
  serviceStartedAt: string | null;
  status: "draft" | "confirmed" | "checked_in" | "seated" | "completed" | "cancelled" | "no_show";
  createdAt: string | null;
  updatedAt: string | null;
};

export type ReservationTableAllocationApi = {
  id: number;
  reservationId: number;
  tableId: number;
  tableName: string | null;
  tableCode: string | null;
  allocatedAt: string | null;
  allocatedByUserId: number | null;
};

export type CreateReservationPayload = {
  outletId: number;
  customerName: string;
  customerPhone?: string | null;
  memberId?: number | null;
  partySize: number;
  reservationAt: string;
};

export async function listReservations(
  outletId: number,
  status?: ReservationApi["status"],
): Promise<ReservationApi[]> {
  const params = new URLSearchParams({ outletId: String(outletId) });
  if (status) params.set("status", status);
  const res = await request<Envelope<ReservationApi[]>>(`/reservations?${params.toString()}`);
  return res.data;
}

export async function getReservation(id: number): Promise<ReservationApi> {
  const res = await request<Envelope<ReservationApi>>(`/reservations/${encodeURIComponent(String(id))}`);
  return res.data;
}

export async function createReservation(body: CreateReservationPayload): Promise<ReservationApi> {
  const res = await request<MessageEnvelope<ReservationApi>>("/reservations", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function confirmReservation(id: number): Promise<ReservationApi> {
  const res = await request<MessageEnvelope<ReservationApi>>(
    `/reservations/${encodeURIComponent(String(id))}/confirm`,
    { method: "POST" },
  );
  return res.data;
}

async function postReservationAction(id: number, action: string): Promise<ReservationApi> {
  const res = await request<MessageEnvelope<ReservationApi>>(
    `/reservations/${encodeURIComponent(String(id))}/${action}`,
    { method: "POST" },
  );
  return res.data;
}

export function checkInReservation(id: number): Promise<ReservationApi> {
  return postReservationAction(id, "check-in");
}

export function seatReservation(id: number): Promise<ReservationApi> {
  return postReservationAction(id, "seat");
}

export function completeReservation(id: number): Promise<ReservationApi> {
  return postReservationAction(id, "complete");
}

export function cancelReservation(id: number): Promise<ReservationApi> {
  return postReservationAction(id, "cancel");
}

export function markNoShowReservation(id: number): Promise<ReservationApi> {
  return postReservationAction(id, "mark-no-show");
}

type StartServiceEnvelope = MessageEnvelope<ReservationApi> & {
  linkedOrderId: number;
  serviceStartedAt: string;
};

export async function startReservationService(id: number): Promise<StartServiceEnvelope> {
  return request<StartServiceEnvelope>(
    `/reservations/${encodeURIComponent(String(id))}/start-service`,
    { method: "POST" },
  );
}

export type ReservationPosLoadPayload = {
  reservationId: number;
  reservationCode: string;
  outletId: number;
  linkedOrderId: string;
  linkedOrderCode?: string | null;
  tableId: number | null;
  tableName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  memberId?: number | null;
  memberNo?: string | null;
  memberName?: string | null;
  loyaltyAccountId?: string | null;
};

export type ReservationPosOpenResponse = {
  posSession: { sessionType: "reservation"; reservationCode: string };
  loadPayload: ReservationPosLoadPayload;
};

export async function openReservationInPos(id: number): Promise<ReservationPosOpenResponse> {
  return request<ReservationPosOpenResponse>(
    `/reservations/${encodeURIComponent(String(id))}/open-in-pos`,
    { method: "POST" },
  );
}

export type ReservationPosQueueApi = {
  readyToStart: ReservationApi[];
  inService: ReservationApi[];
};

export async function getReservationPosQueue(outletId: number): Promise<ReservationPosQueueApi> {
  return request<ReservationPosQueueApi>(`/reservations/pos-queue?outletId=${outletId}`);
}

export async function updateReservationMember(id: number, memberId: number | null): Promise<ReservationApi> {
  const res = await request<MessageEnvelope<ReservationApi>>(
    `/reservations/${encodeURIComponent(String(id))}`,
    { method: "PATCH", body: JSON.stringify({ memberId }) },
  );
  return res.data;
}

export async function listAllocatedTables(reservationId: number): Promise<ReservationTableAllocationApi[]> {
  const res = await request<Envelope<ReservationTableAllocationApi[]>>(
    `/reservations/${encodeURIComponent(String(reservationId))}/allocated-tables`,
  );
  return res.data;
}

export async function allocateReservationTable(
  reservationId: number,
  payload: { tableId?: number; tableIds?: number[] },
): Promise<ReservationTableAllocationApi[]> {
  const res = await request<MessageEnvelope<ReservationTableAllocationApi[]>>(
    `/reservations/${encodeURIComponent(String(reservationId))}/allocate-table`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return res.data;
}

export async function unallocateReservationTable(
  reservationId: number,
  tableId: number,
): Promise<ReservationTableAllocationApi[]> {
  const res = await request<MessageEnvelope<ReservationTableAllocationApi[]>>(
    `/reservations/${encodeURIComponent(String(reservationId))}/unallocate-table`,
    { method: "POST", body: JSON.stringify({ tableId }) },
  );
  return res.data;
}

export type ReservationMetricsApi = {
  totalReservations: number;
  confirmed: number;
  checkedIn: number;
  seated: number;
  completed: number;
  cancelled: number;
  noShow: number;
  noShowRate: number;
  averageCheckinDelayMinutes: number;
  averageSeatingDelayMinutes: number;
  from: string;
  to: string;
};

export type ReservationTimelineEventApi = {
  type: string;
  label: string;
  occurredAt: string;
  meta?: Record<string, unknown> | null;
};

export type ReservationDashboardApi = {
  metrics: ReservationMetricsApi;
  upcomingReservations: ReservationApi[];
  activeReservations: ReservationApi[];
  noShowToday: number;
};

export async function getReservationDashboard(
  outletId: number,
  from?: string,
  to?: string,
): Promise<ReservationDashboardApi> {
  const params = new URLSearchParams({ outletId: String(outletId) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return request<ReservationDashboardApi>(`/reservations/dashboard?${params.toString()}`);
}

export async function getReservationTimeline(
  reservationId: number,
): Promise<ReservationTimelineEventApi[]> {
  const res = await request<{ data: ReservationTimelineEventApi[] }>(
    `/reservations/${encodeURIComponent(String(reservationId))}/timeline`,
  );
  return res.data;
}
