import { apiRequest as request } from "./client";

type ApiListEnvelope<T> = { data: T[] };
type ApiListEnvelopeWithMeta<T> = {
  data: T[];
  meta?: {
    current_page?: number;
    currentPage?: number;
    per_page?: number;
    perPage?: number;
    total?: number;
    last_page?: number;
    lastPage?: number;
  };
};
type ApiSingleEnvelope<T> = { data: T };

export type AccountingListMeta = {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
};

export type AccountApiRow = {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  subtype: string;
  parentId?: string | null;
  description?: string | null;
  active: boolean;
  normalBalance?: "debit" | "credit" | null;
  currencyCode?: string | null;
  tags?: string[] | null;
};

export type AccountCreatePayload = {
  tenantId?: number;
  code: string;
  name: string;
  type: AccountApiRow["type"];
  subtype?: string;
  parentId?: string | null;
  description?: string;
  active?: boolean;
  normalBalance?: "debit" | "credit";
  currencyCode?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type AccountUpdatePayload = Partial<AccountCreatePayload>;

export type JournalLineApi = {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  memo?: string | null;
  exchangeRate?: number | null;
  baseDebit?: number | null;
  baseCredit?: number | null;
};

export type JournalApiRow = {
  id: string;
  journalNo: string;
  date: string;
  reference: string;
  description: string;
  outlet: string;
  status: "draft" | "posted";
  lines: JournalLineApi[];
  postedAt?: string | null;
  sourceType?: string | null;
  sourceId?: string | number | null;
  externalRef?: string | null;
};

export type JournalCreatePayload = {
  tenantId?: number;
  journalNo?: string;
  journalDate: string;
  description?: string;
  outlet?: string;
  status?: "draft" | "posted";
  sourceType?: string;
  sourceId?: string | number;
  externalRef?: string;
  postedAt?: string;
  lines: { accountId: string; debit: number; credit: number; memo?: string }[];
};

export type JournalUpdatePayload = Partial<
  Pick<JournalCreatePayload, "journalDate" | "description" | "outlet">
> & {
  lines?: JournalCreatePayload["lines"];
};

export async function listAccounts(): Promise<AccountApiRow[]> {
  const res = await request<ApiListEnvelope<AccountApiRow>>("/accounts");
  return res.data;
}

export async function listAccountsWithMeta(): Promise<{ items: AccountApiRow[]; meta: AccountingListMeta }> {
  const res = await request<ApiListEnvelopeWithMeta<AccountApiRow>>("/accounts");
  const meta = res.meta ?? {};
  return {
    items: res.data,
    meta: {
      currentPage: Number(meta.currentPage ?? meta.current_page ?? 1),
      perPage: Number(meta.perPage ?? meta.per_page ?? res.data.length),
      total: Number(meta.total ?? res.data.length),
      lastPage: Number(meta.lastPage ?? meta.last_page ?? 1),
    },
  };
}

export async function createAccount(payload: AccountCreatePayload): Promise<AccountApiRow> {
  const res = await request<{ data: AccountApiRow }>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateAccount(id: string, payload: AccountUpdatePayload): Promise<AccountApiRow> {
  const res = await request<{ data: AccountApiRow }>(`/accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteAccount(id: string): Promise<void> {
  await request<{ message: string }>(`/accounts/${id}`, {
    method: "DELETE",
  });
}

export async function listJournals(): Promise<JournalApiRow[]> {
  const res = await request<ApiListEnvelope<JournalApiRow>>("/journals");
  return res.data;
}

export async function listJournalsWithMeta(): Promise<{ items: JournalApiRow[]; meta: AccountingListMeta }> {
  const res = await request<ApiListEnvelopeWithMeta<JournalApiRow>>("/journals");
  const meta = res.meta ?? {};
  return {
    items: res.data,
    meta: {
      currentPage: Number(meta.currentPage ?? meta.current_page ?? 1),
      perPage: Number(meta.perPage ?? meta.per_page ?? res.data.length),
      total: Number(meta.total ?? res.data.length),
      lastPage: Number(meta.lastPage ?? meta.last_page ?? 1),
    },
  };
}

export async function createJournal(payload: JournalCreatePayload): Promise<JournalApiRow> {
  const res = await request<{ data: JournalApiRow }>("/journals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateJournal(id: string, payload: JournalUpdatePayload): Promise<JournalApiRow> {
  const res = await request<{ data: JournalApiRow }>(`/journals/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteJournal(id: string): Promise<void> {
  await request<{ message: string }>(`/journals/${id}`, {
    method: "DELETE",
  });
}

export async function postJournal(id: string): Promise<JournalApiRow> {
  const res = await request<{ data: JournalApiRow }>(`/journals/${id}/post`, {
    method: "POST",
  });
  return res.data;
}

export type ReportAccountRow = {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  subtype: string;
  parentId?: string | null;
  description?: string | null;
  active: boolean;
};

export type LedgerReportRow = {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export type LedgerReportData = {
  account: ReportAccountRow | null;
  rows: LedgerReportRow[];
  opening: number;
  closing: number;
};

export type ProfitLossReportData = {
  revenue: { account: ReportAccountRow; amount: number }[];
  cogs: { account: ReportAccountRow; amount: number }[];
  expenses: { account: ReportAccountRow; amount: number }[];
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
};

export type BalanceSheetReportData = {
  currentAssets: { account: ReportAccountRow; amount: number }[];
  fixedAssets: { account: ReportAccountRow; amount: number }[];
  shortLiab: { account: ReportAccountRow; amount: number }[];
  longLiab: { account: ReportAccountRow; amount: number }[];
  equity: { account: ReportAccountRow; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netProfit: number;
  balanced: boolean;
};
export type TrialBalanceReportRow = {
  accountId: string;
  code: string;
  name: string;
  debit: number;
  credit: number;
  openingDebit?: number;
  openingCredit?: number;
  movementDebit?: number;
  movementCredit?: number;
  closingDebit?: number;
  closingCredit?: number;
};

export type TrialBalanceReportData = {
  rows: TrialBalanceReportRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
};

export type AccountingPeriodApiRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "open" | "closed";
  outletId?: string | null;
  closedAt?: string | null;
  closedByUserId?: string | null;
};

export type AccountingPeriodCreatePayload = {
  name?: string;
  tenantId?: number;
  outletId?: number;
  startDate: string;
  endDate: string;
};

export async function getLedgerReport(params: {
  accountId: string;
  from?: string;
  to?: string;
  outlet?: string;
}): Promise<LedgerReportData> {
  const qs = new URLSearchParams();
  qs.set("accountId", params.accountId);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.outlet) qs.set("outlet", params.outlet);
  const res = await request<ApiSingleEnvelope<LedgerReportData>>(`/reports/ledger?${qs.toString()}`);
  return res.data;
}

export async function getProfitLossReport(params: {
  from?: string;
  to?: string;
  outlet?: string;
}): Promise<ProfitLossReportData> {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.outlet) qs.set("outlet", params.outlet);
  const suffix = qs.toString();
  const res = await request<ApiSingleEnvelope<ProfitLossReportData>>(`/reports/profit-loss${suffix ? `?${suffix}` : ""}`);
  return res.data;
}

export async function getBalanceSheetReport(params: {
  to?: string;
  outlet?: string;
}): Promise<BalanceSheetReportData> {
  const qs = new URLSearchParams();
  if (params.to) qs.set("to", params.to);
  if (params.outlet) qs.set("outlet", params.outlet);
  const suffix = qs.toString();
  const res = await request<ApiSingleEnvelope<BalanceSheetReportData>>(`/reports/balance-sheet${suffix ? `?${suffix}` : ""}`);
  return res.data;
}

export async function getTrialBalanceReport(params: {
  from?: string;
  to?: string;
  outlet?: string;
  page?: number;
  perPage?: number;
}): Promise<TrialBalanceReportData> {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.outlet) qs.set("outlet", params.outlet);
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.perPage !== undefined) qs.set("perPage", String(params.perPage));
  const suffix = qs.toString();
  const res = await request<ApiSingleEnvelope<TrialBalanceReportData>>(`/reports/trial-balance${suffix ? `?${suffix}` : ""}`);
  return res.data;
}

export async function listAccountingPeriods(params?: {
  page?: number;
  perPage?: number;
}): Promise<{ items: AccountingPeriodApiRow[]; meta: AccountingListMeta }> {
  const qs = new URLSearchParams();
  if (params?.page !== undefined) qs.set("page", String(params.page));
  if (params?.perPage !== undefined) qs.set("perPage", String(params.perPage));
  const suffix = qs.toString();
  const res = await request<
    { data: AccountingPeriodApiRow[]; meta?: ApiListEnvelopeWithMeta<unknown>["meta"] } | ApiListEnvelopeWithMeta<AccountingPeriodApiRow>
  >(`/accounting-periods${suffix ? `?${suffix}` : ""}`);

  const data = Array.isArray((res as ApiListEnvelopeWithMeta<AccountingPeriodApiRow>).data)
    ? (res as ApiListEnvelopeWithMeta<AccountingPeriodApiRow>).data
    : [];
  const meta = (res as { meta?: ApiListEnvelopeWithMeta<unknown>["meta"] }).meta ?? {};
  return {
    items: data,
    meta: {
      currentPage: Number(meta.currentPage ?? meta.current_page ?? params?.page ?? 1),
      perPage: Number(meta.perPage ?? meta.per_page ?? params?.perPage ?? data.length),
      total: Number(meta.total ?? data.length),
      lastPage: Number(meta.lastPage ?? meta.last_page ?? 1),
    },
  };
}

export async function createAccountingPeriod(payload: AccountingPeriodCreatePayload): Promise<AccountingPeriodApiRow> {
  const res = await request<{ data: AccountingPeriodApiRow }>("/accounting-periods", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function closeAccountingPeriod(periodId: string): Promise<AccountingPeriodApiRow> {
  const res = await request<{ data: AccountingPeriodApiRow }>(`/accounting-periods/${periodId}/close`, {
    method: "POST",
  });
  return res.data;
}

export async function openAccountingPeriod(periodId: string): Promise<AccountingPeriodApiRow> {
  const res = await request<{ data: AccountingPeriodApiRow }>(`/accounting-periods/${periodId}/open`, {
    method: "POST",
  });
  return res.data;
}
