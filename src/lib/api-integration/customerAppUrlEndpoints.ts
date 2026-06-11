import { apiRequest as request } from "./client";

type Envelope<T> = { data: T };

export type CustomerAppUrlSettings = {
  customerAppUrl: string | null;
  resolvedCustomerAppUrl: string | null;
  source: "customer_app_url" | "frontend_url" | "app_url";
};

export async function getCustomerAppUrlSettings(): Promise<CustomerAppUrlSettings> {
  const res = await request<Envelope<CustomerAppUrlSettings>>("/settings/customer-app-url");
  return res.data;
}

export async function patchCustomerAppUrlSettings(customerAppUrl: string | null): Promise<CustomerAppUrlSettings> {
  const res = await request<Envelope<CustomerAppUrlSettings>>("/settings/customer-app-url", {
    method: "PATCH",
    body: JSON.stringify({ customerAppUrl }),
  });
  return res.data;
}
