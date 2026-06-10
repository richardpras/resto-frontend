import { apiRequest as request } from "./client";

export type ExecutiveSalesSummary = {
  grossSales: number;
  promotionDiscount: number;
  voucherDiscount: number;
  loyaltyDiscount: number;
  manualDiscount: number;
  giftCardRedemption: number;
  totalDiscounts: number;
  netSales: number;
  refundAmount: number;
  refundCount: number;
  finalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  giftCardSalesSettled: number;
  storeCreditSettled: number;
  comparison?: {
    period: { startDate: string; endDate: string };
    previous: { finalRevenue: number; orderCount: number; averageOrderValue: number };
    growth: {
      revenueGrowthPercent: number;
      orderGrowthPercent: number;
      averageOrderValueGrowthPercent: number;
    };
  };
  accountingReconciliation?: {
    accountingRevenue: number;
    executiveRevenue: number;
    difference: number;
    status: "balanced" | "variance";
  };
};

export type ExecutiveSalesTrend = {
  date: string;
  grossSales: number;
  netSales: number;
  refunds: number;
};

export type ExecutiveSalesChannel = {
  channel: string;
  sales: number;
  orders: number;
  averageOrderValue: number;
};

export type ExecutiveSalesPayment = {
  method: string;
  amount: number;
  percentage: number;
  transactionCount: number;
};

export type ExecutiveSalesDiscount = {
  type: string;
  amount: number;
  informational?: boolean;
};

export type ExecutiveSalesTopProduct = {
  productId: string;
  productName: string;
  quantity: number;
  grossSales: number;
  netSales: number;
};

export type ExecutiveSalesReport = {
  summary: ExecutiveSalesSummary;
  trends: ExecutiveSalesTrend[];
  channels: ExecutiveSalesChannel[];
  payments: ExecutiveSalesPayment[];
  discounts: ExecutiveSalesDiscount[];
  topProducts: ExecutiveSalesTopProduct[];
  filters: {
    outletIds: number[];
    startDate: string;
    endDate: string;
    comparisonPeriod?: string | null;
  };
};

export type ExecutiveSalesParams = {
  outletId?: number;
  startDate?: string;
  endDate?: string;
  comparisonPeriod?: "previous_period";
};

export async function fetchExecutiveSalesReport(params: ExecutiveSalesParams = {}): Promise<ExecutiveSalesReport> {
  const qs = new URLSearchParams();
  if (params.outletId) qs.set("outletId", String(params.outletId));
  if (params.startDate) qs.set("startDate", params.startDate);
  if (params.endDate) qs.set("endDate", params.endDate);
  if (params.comparisonPeriod) qs.set("comparisonPeriod", params.comparisonPeriod);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await request<{ data: ExecutiveSalesReport }>(`/reports/executive-sales${suffix}`);
  return res.data;
}
