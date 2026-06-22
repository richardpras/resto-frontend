import { apiRequest as request } from "./client";
import type { MenuItemApi } from "./endpoints";
import type { PosSessionApi } from "./posSessionEndpoints";
import type { Merchant, SystemPrefs } from "@/domain/settingsDomainTypes";

export type PosBootstrapMerchant = Pick<Merchant, "name" | "currency" | "timezone" | "language"> & {
  logo?: string;
};

export type PosBootstrapSystem = SystemPrefs;

export type PosBootstrapResponse = {
  merchant: PosBootstrapMerchant;
  system: PosBootstrapSystem;
  menuItems: {
    data: MenuItemApi[];
    meta: {
      current_page: number;
      perPage: number;
      total: number;
      lastPage: number;
    };
  };
  posSession: PosSessionApi | null;
  defaultCashFloat?: number;
};

export type FetchPosBootstrapParams = {
  outletId: number;
  tenantId?: number;
  perPage?: number;
};

export async function fetchPosBootstrap(params: FetchPosBootstrapParams): Promise<PosBootstrapResponse> {
  const query = new URLSearchParams();
  query.set("outletId", String(params.outletId));
  if (params.tenantId !== undefined) query.set("tenantId", String(params.tenantId));
  if (params.perPage !== undefined) query.set("perPage", String(params.perPage));
  const response = await request<{ data: PosBootstrapResponse }>(`/pos/bootstrap?${query.toString()}`);
  return response.data;
}
