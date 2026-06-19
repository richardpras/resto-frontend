import { API_BASE_URL } from "@/lib/api-integration/client";

export type PublicMenuItemApi = {
  id: string;
  name: string;
  category?: string | null;
  price: number;
  emoji?: string | null;
  available: boolean;
  imageUrl?: string | null;
  imageVersion?: number;
  hasImage?: boolean;
};

type PublicMenuResponse = {
  data: PublicMenuItemApi[];
};

export async function fetchPublicQrMenu(qrPublicId: string): Promise<PublicMenuItemApi[]> {
  const response = await fetch(`${API_BASE_URL}/public/qr/tables/${encodeURIComponent(qrPublicId)}/menu`, {
    headers: { Accept: "application/json" },
  });
  const body = (await response.json().catch(() => null)) as PublicMenuResponse | { message?: string } | null;
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return (body as PublicMenuResponse).data ?? [];
}
