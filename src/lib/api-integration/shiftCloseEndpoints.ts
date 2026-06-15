import { apiRequest as request } from "./client";

export type ShiftCloseOpenPosSessionItem = {
  id: number;
  cashierName: string;
  openedAt: string | null;
  openingCash: number;
};

export type ShiftCloseOpenPosSessions = {
  count: number;
  severity: string;
  items: ShiftCloseOpenPosSessionItem[];
};

export type ShiftCloseQrOrders = {
  pending: number;
  underReview: number;
  linkedUnpaidBills: number;
  severity: string;
};

export type ShiftCloseDrawerReconciliation = {
  openingCash: number;
  cashSales: number;
  cashRefunds: number;
  cashExpenses: number;
  cashIn: number;
  cashOut: number;
  cashPayouts?: number;
  nonCashSales?: number;
  totalSales?: number;
  expected: number;
  actual: number | null;
  variance: number | null;
  status: string;
  limitations?: string[];
  paymentBreakdown?: { method: string; amount: number }[];
};

export type ShiftClosePreflightChecks = {
  openBills: number;
  pendingQrOrders: number;
  pendingKitchenTickets: number;
  failedPrintJobs: number;
  pendingConsumption: number;
  failedAccountingPostings: number;
  openPosSession?: number;
  unpostedPaidOrders?: number;
};

export type ShiftClosePreflight = {
  ready: boolean;
  severity: "healthy" | "warning" | "block";
  checks: ShiftClosePreflightChecks;
  openPosSessions?: ShiftCloseOpenPosSessions;
  qrOrders?: ShiftCloseQrOrders;
  drawerReconciliation?: ShiftCloseDrawerReconciliation;
  warnings?: string[];
  blocks?: string[];
  policies?: { openBillPolicy: string; openPosSessionPolicy?: string };
};

export type ShiftCloseCashResult = ShiftCloseDrawerReconciliation;

export type ShiftCloseRunResult = {
  runId: number;
  status?: string;
  preflight: ShiftClosePreflight;
  inventory: {
    processed: number;
    failed: number;
    varianceDetected: number;
    reviewRequired?: number;
    totalCogs?: number;
  };
  accounting: {
    skipped?: boolean;
    reason?: string;
    orderCount?: number;
    totalSales?: number;
    totalCogs?: number;
    journalId?: string | null;
  };
  cash: ShiftCloseCashResult;
  orderCount: number;
  totalSales: number;
  totalCogs: number;
  journalId: string | null;
  skipped?: boolean;
  reason?: string;
  forced?: boolean;
  reportPath?: string;
  inventoryConsumption?: {
    processed: number;
    reviewRequired: number;
    failed: number;
    totalCogs: number;
  };
};

export type ShiftCloseReadiness = {
  label: string;
  ready: boolean;
  severity: string;
  checks: ShiftClosePreflightChecks;
  openPosSessions?: ShiftCloseOpenPosSessions;
  qrOrders?: ShiftCloseQrOrders;
  warnings: string[];
  blocks: string[];
  lastRunStatus?: string | null;
  closeRunning?: boolean;
  lastClose: {
    runId: number;
    completedAt: string | null;
    status?: string;
    openBillCount: number;
    openPosSessionCount?: number;
    pendingQr?: number;
    cashVariance: number | null;
    inventoryVariance: number;
    postingStatus: string;
    journalId: string | null;
  } | null;
};

export type ShiftCloseHistoryRow = {
  id: number;
  shiftDate?: string | null;
  status: string;
  severity: string | null;
  ready: boolean;
  salesAmount?: number | null;
  cashExpected: number | null;
  cashActual: number | null;
  cashVariance: number | null;
  inventoryVariance?: number;
  openBillCount?: number;
  openPosSessionCount?: number;
  pendingQrCount?: number;
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
};

export type ShiftCloseReport = {
  format: string;
  pdfAvailable: boolean;
  runId: number;
  outlet: { id: number; name?: string; code?: string };
  shiftDate?: string;
  status: string;
  sales: { total: number; cash: number; nonCash: number };
  cashReconciliation: ShiftCloseDrawerReconciliation;
  cashVariance: number | null;
};

export async function getShiftClosePreflight(outletId: number, tenantId?: number): Promise<ShiftClosePreflight> {
  const params = new URLSearchParams({ outletId: String(outletId) });
  if (tenantId) params.set("tenantId", String(tenantId));
  const res = await request<{ data: ShiftClosePreflight }>(`/shift-close/preflight?${params}`);
  return res.data;
}

export async function getShiftCloseReadiness(outletId: number, tenantId?: number): Promise<ShiftCloseReadiness> {
  const params = new URLSearchParams({ outletId: String(outletId) });
  if (tenantId) params.set("tenantId", String(tenantId));
  const res = await request<{ data: ShiftCloseReadiness }>(`/shift-close/readiness?${params}`);
  return res.data;
}

export async function getShiftCloseHistory(outletId: number, limit = 10): Promise<ShiftCloseHistoryRow[]> {
  const res = await request<{ data: ShiftCloseHistoryRow[] }>(
    `/shift-close/history?outletId=${outletId}&limit=${limit}`,
  );
  return res.data;
}

export async function getShiftCloseReport(runId: number, outletId: number): Promise<ShiftCloseReport> {
  const res = await request<{ data: ShiftCloseReport }>(`/shift-close/${runId}/report?outletId=${outletId}`);
  return res.data;
}

export async function postShiftCloseRun(payload: {
  outletId: number;
  tenantId?: number;
  confirm?: boolean;
  force?: boolean;
  actualCash?: number;
  posSessionId?: number;
}): Promise<ShiftCloseRunResult> {
  const res = await request<{ data: ShiftCloseRunResult }>("/shift-close/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
