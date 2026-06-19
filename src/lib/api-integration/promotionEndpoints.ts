import { apiRequest } from "./client";
import type { OrderApi } from "./endpoints";

export type PromotionType =
  | "percentage_order"
  | "percentage_items"
  | "fixed_amount"
  | "buy_x_get_y";

export type PromotionConfig = {
  rate?: number;
  maxDiscount?: number | null;
  amount?: number;
  buyQty?: number;
  getQty?: number;
  menuItemIds?: string[];
};

export type PromotionConditions = {
  minSpend?: number;
  menuItemIds?: string[];
  categories?: string[];
  dayRestriction?: string[];
  timeStart?: string | null;
  timeEnd?: string | null;
  usageLimitPerDay?: number;
};

export type PromotionRow = {
  id: string;
  outletId: number;
  code: string;
  name: string;
  description?: string | null;
  type: PromotionType;
  config: PromotionConfig;
  conditions: PromotionConditions;
  priority: number;
  isCombinable: boolean;
  exclusive: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PromotionCandidate = {
  promotionId: number;
  promotionCode: string;
  promotionName: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  priority: number;
  appliedItems: { itemId: string; qty: number; discount: number }[];
};

export type PromotionEvaluateResult = {
  subtotal: number;
  candidates: PromotionCandidate[];
  best: PromotionCandidate | null;
};

export type PromotionPreview = {
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  tax?: number;
  total?: number;
  balanceDue?: number;
};

export type OrderPromotionApi = {
  promotionId: string | null;
  promotionCode: string;
  promotionName: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  appliedItems?: { itemId: string; qty: number; discount: number }[];
  appliedAt?: string;
};

export async function listPromotions(outletId: number, isActive?: boolean): Promise<PromotionRow[]> {
  const params = new URLSearchParams({ outletId: String(outletId) });
  if (isActive !== undefined) params.set("isActive", String(isActive));
  const res = await apiRequest<{ data: PromotionRow[] }>(`/promotions?${params.toString()}`);
  return res.data;
}

export async function createPromotion(payload: {
  outletId: number;
  code: string;
  name: string;
  description?: string;
  type: PromotionType;
  config: PromotionConfig;
  conditions?: PromotionConditions;
  priority?: number;
  isCombinable?: boolean;
  exclusive?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive?: boolean;
}): Promise<PromotionRow> {
  const res = await apiRequest<{ data: PromotionRow }>("/promotions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updatePromotion(
  id: string,
  payload: Partial<{
    code: string;
    name: string;
    description: string | null;
    type: PromotionType;
    config: PromotionConfig;
    conditions: PromotionConditions;
    priority: number;
    isCombinable: boolean;
    exclusive: boolean;
    validFrom: string | null;
    validUntil: string | null;
  }>,
): Promise<PromotionRow> {
  const res = await apiRequest<{ data: PromotionRow }>(`/promotions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function setPromotionActivation(id: string, isActive: boolean): Promise<PromotionRow> {
  const res = await apiRequest<{ data: PromotionRow }>(`/promotions/${id}/activation`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return res.data;
}

export async function evaluatePromotions(payload: {
  outletId: number;
  subtotal: number;
  items: { id: string; price: number; qty: number; name?: string; category?: string }[];
}): Promise<PromotionEvaluateResult> {
  return apiRequest<PromotionEvaluateResult>("/promotions/evaluate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function applyOrderPromotion(
  orderId: string | number,
  promotionId: number,
): Promise<{ data: OrderApi; preview: PromotionPreview; message?: string }> {
  return apiRequest(`/orders/${orderId}/promotions`, {
    method: "POST",
    body: JSON.stringify({ promotionId }),
  });
}

export async function applyOrderPromotionByCode(
  orderId: string | number,
  code: string,
): Promise<{ data: OrderApi; preview: PromotionPreview; message?: string }> {
  return apiRequest(`/orders/${orderId}/promotions/by-code`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function removeOrderPromotion(
  orderId: string | number,
): Promise<{ data: OrderApi; preview: PromotionPreview; message?: string }> {
  return apiRequest(`/orders/${orderId}/promotions`, {
    method: "DELETE",
  });
}

export async function fetchOrderPromotionPreview(orderId: string | number): Promise<PromotionPreview> {
  const res = await apiRequest<{ preview: PromotionPreview }>(`/orders/${orderId}/promotion-preview`);
  return res.preview;
}
