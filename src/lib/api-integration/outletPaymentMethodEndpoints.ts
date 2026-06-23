import { apiRequest as request } from "./client";

export type OutletPaymentMethodType =
  | "cash"
  | "manual_qris"
  | "gateway_qris"
  | "manual_transfer"
  | "future_gateway"
  | "future_terminal";

export type OutletPaymentMethodConfigApi = {
  id: number;
  outletId: number;
  paymentMethodCode: string;
  type: OutletPaymentMethodType;
  provider?: string | null;
  enabled: boolean;
  displayOrder: number;
  isDefault: boolean;
  label: string;
  settlementMethod: string;
  chartAccountId?: number | null;
  chartAccountCode?: string | null;
  settings?: {
    instructions?: string;
    qr_image_path?: string;
    qr_image_url?: string;
  };
  isGateway?: boolean;
  isManualQris?: boolean;
  isCash?: boolean;
};

export async function listOutletPaymentMethodConfigs(outletId: number): Promise<OutletPaymentMethodConfigApi[]> {
  const response = await request<{ data: OutletPaymentMethodConfigApi[] }>(
    `/outlets/${outletId}/payment-method-configs`,
  );
  return response.data;
}

export async function listOutletCheckoutMethods(outletId: number): Promise<OutletPaymentMethodConfigApi[]> {
  const response = await request<{ data: OutletPaymentMethodConfigApi[] }>(
    `/outlets/${outletId}/payment-checkout-methods`,
  );
  return response.data;
}

export async function syncOutletPaymentMethodConfigs(
  outletId: number,
  configs: Array<{
    paymentMethodCode: string;
    enabled?: boolean;
    displayOrder?: number;
    isDefault?: boolean;
    provider?: string | null;
    settings?: Record<string, unknown>;
    chartAccountId?: number | null;
  }>,
): Promise<OutletPaymentMethodConfigApi[]> {
  const response = await request<{ data: OutletPaymentMethodConfigApi[] }>(
    `/outlets/${outletId}/payment-method-configs`,
    {
      method: "PUT",
      body: JSON.stringify({ configs }),
    },
  );
  return response.data;
}

export async function uploadOutletStaticQrisImage(
  outletId: number,
  file: File,
): Promise<OutletPaymentMethodConfigApi> {
  const form = new FormData();
  form.append("image", file);
  const response = await request<{ data: OutletPaymentMethodConfigApi }>(
    `/outlets/${outletId}/payment-method-configs/static-qris-image`,
    {
      method: "POST",
      body: form,
    },
  );
  return response.data;
}
