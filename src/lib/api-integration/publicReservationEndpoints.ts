import { API_BASE_URL } from "@/lib/api-integration/client";
import type { PublicMenuItemApi } from "@/lib/api-integration/publicMenuEndpoints";

export type PublicReservationSettingsApi = {
  depositMode: "percent" | "flat";
  depositPercent: number | null;
  depositFlatAmount: number | null;
  preorderRequired: boolean;
  depositInstructions: string | null;
};

export type PublicReservationOutletApi = {
  id: number;
  name: string;
  address: string;
  phone: string;
};

export type PublicReservationInviteMetaApi = {
  expiresAt: string | null;
  token: string;
};

export type PublicReservationContextApi = {
  outlet: PublicReservationOutletApi;
  settings: PublicReservationSettingsApi;
  publicSlug?: string;
  invite?: PublicReservationInviteMetaApi;
};

export type PublicReservationApi = {
  id: number;
  reservationCode: string;
  customerName: string;
  customerPhone: string | null;
  partySize: number;
  reservationAt: string;
  status: string;
  requiredDepositAmount: number | null;
  approvedDepositAmount: number | null;
  depositRejectionReason?: string | null;
  linkedOrder?: {
    subtotal: number;
    tax: number;
    total: number;
    paidTotal: number;
    balanceDue: number;
    items: Array<{ id: number; name: string; qty: number; price: number }>;
  } | null;
};

type Envelope<T> = { data: T; message?: string };

async function publicJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | T | null;
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

export async function fetchPublicReservationContext(outletSlug: string): Promise<PublicReservationContextApi> {
  return publicJson<PublicReservationContextApi>(`/public/reserve/${encodeURIComponent(outletSlug)}`);
}

export async function fetchPublicReservationMenu(outletSlug: string): Promise<PublicMenuItemApi[]> {
  const body = await publicJson<{ data: PublicMenuItemApi[] }>(
    `/public/reserve/${encodeURIComponent(outletSlug)}/menu`,
  );
  return body.data ?? [];
}

export async function fetchPublicReservationInviteContext(token: string): Promise<PublicReservationContextApi> {
  return publicJson<PublicReservationContextApi>(`/public/reserve/invite/${encodeURIComponent(token)}`);
}

export async function fetchPublicReservationInviteMenu(token: string): Promise<PublicMenuItemApi[]> {
  const body = await publicJson<{ data: PublicMenuItemApi[] }>(
    `/public/reserve/invite/${encodeURIComponent(token)}/menu`,
  );
  return body.data ?? [];
}

export type CreatePublicReservationPayload = {
  customerName: string;
  customerPhone?: string;
  partySize: number;
  reservationAt: string;
  items?: Array<{ menuItemId: number; qty: number }>;
};

export async function createPublicReservation(
  outletSlug: string,
  payload: CreatePublicReservationPayload,
): Promise<PublicReservationApi> {
  const body = await publicJson<Envelope<PublicReservationApi>>(
    `/public/reserve/${encodeURIComponent(outletSlug)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return body.data;
}

export async function createPublicReservationFromInvite(
  token: string,
  payload: CreatePublicReservationPayload,
): Promise<PublicReservationApi> {
  const body = await publicJson<Envelope<PublicReservationApi>>(
    `/public/reserve/invite/${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return body.data;
}

export async function fetchPublicReservationByCode(reservationCode: string): Promise<PublicReservationApi> {
  const body = await publicJson<Envelope<PublicReservationApi>>(
    `/public/reservations/${encodeURIComponent(reservationCode)}`,
  );
  return body.data;
}

export async function uploadPublicReservationDepositProof(
  reservationCode: string,
  file: File,
): Promise<PublicReservationApi> {
  const form = new FormData();
  form.append("proof", file);
  const body = await publicJson<Envelope<PublicReservationApi>>(
    `/public/reservations/${encodeURIComponent(reservationCode)}/deposit-proof`,
    { method: "POST", body: form },
  );
  return body.data;
}

export async function downloadPublicReservationPdf(reservationCode: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/public/reservations/${encodeURIComponent(reservationCode)}/pdf`,
    { headers: { Accept: "application/pdf" } },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || `Request failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reservation-${reservationCode}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function estimateDepositAmount(
  settings: PublicReservationSettingsApi,
  orderTotal: number,
): number {
  if (settings.depositMode === "percent") {
    const percent = settings.depositPercent ?? 0;
    return Math.round(orderTotal * percent) / 100;
  }
  return settings.depositFlatAmount ?? 0;
}
