import { apiRequest as request } from "./client";

type Envelope<T> = { data: T };

export type OpenBillOrderApi = {
  id: number;
  code: string;
  source: "pos" | "qr";
  orderSource?: {
    type: string;
    label: string;
    code: string | null;
    id: number | null;
  };
  orderChannel?: string | null;
  status: string;
  paymentStatus: "unpaid" | "partial" | "paid";
  customerName?: string | null;
  subtotal: number;
  tax: number;
  service: number;
  total: number;
  settledAmount: number;
  remainingPayable: number;
  createdAt?: string | null;
};

export type OpenBillByTableApi = {
  table: {
    id: number;
    outletId: number;
    name: string;
    code?: string | null;
  };
  orders: OpenBillOrderApi[];
  subtotal: number;
  tax: number;
  service: number;
  remainingPayable: number;
  orderCount: number;
};

export async function getOpenBillByTable(outletId: number, tableId: number): Promise<OpenBillByTableApi> {
  const query = `outletId=${encodeURIComponent(String(outletId))}&tableId=${encodeURIComponent(String(tableId))}`;
  const res = await request<Envelope<OpenBillByTableApi>>(`/open-bills/table?${query}`);
  return res.data;
}
