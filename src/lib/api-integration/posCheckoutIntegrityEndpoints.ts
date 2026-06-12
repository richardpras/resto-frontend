import { apiRequest as request } from "./client";

export type PosCheckoutIntegrityHealth = {
  label: string;
  retries: number;
  idempotencyHits: number;
  duplicatePreventionCount: number;
  resumeExistingOrderCount: number;
  qrResumeCount: number;
};

export async function getPosCheckoutIntegrityHealth(
  outletId: number,
  hours = 24,
): Promise<PosCheckoutIntegrityHealth> {
  const res = await request<{ data: PosCheckoutIntegrityHealth }>(
    `/pos/checkout-integrity-health?outletId=${outletId}&hours=${hours}`,
  );
  return res.data;
}
