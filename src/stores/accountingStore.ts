import { create } from "zustand";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  closeAccountingPeriod as closeAccountingPeriodApi,
  createAccountingPeriod as createAccountingPeriodApi,
  createAccount as createAccountApi,
  createJournal as createJournalApi,
  deleteAccount as deleteAccountApi,
  deleteJournal as deleteJournalApi,
  getBalanceSheetReport as getBalanceSheetReportApi,
  getLedgerReport as getLedgerReportApi,
  getProfitLossReport as getProfitLossReportApi,
  getTrialBalanceReport as getTrialBalanceReportApi,
  listAccountingPeriods as listAccountingPeriodsApi,
  listAccountsWithMeta as listAccountsWithMetaApi,
  listJournalsWithMeta as listJournalsWithMetaApi,
  listOutlets as listOutletsApi,
  openAccountingPeriod as openAccountingPeriodApi,
  postJournal as postJournalApi,
  updateAccount as updateAccountApi,
  updateJournal as updateJournalApi,
  type AccountCreatePayload,
  type AccountingPeriodApiRow,
  type AccountingPeriodCreatePayload,
  type AccountUpdatePayload,
  type AccountingListMeta,
  type BalanceSheetReportData,
  type JournalCreatePayload,
  type JournalUpdatePayload,
  type LedgerReportData,
  type ProfitLossReportData,
  type TrialBalanceReportData,
  type TrialBalanceReportRow,
} from "@/lib/api";
import { accountFromApi, journalFromApi, trialBalanceRowFromApi } from "@/lib/accountingMappers";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type AccountSubtype =
  | "current_asset"
  | "fixed_asset"
  | "short_term_liability"
  | "long_term_liability"
  | "equity"
  | "revenue"
  | "cogs"
  | "expense";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  parentId?: string;
  description?: string;
  active: boolean;
}

export interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string; // ISO date yyyy-mm-dd
  reference?: string;
  description: string;
  outlet: string;
  status: "draft" | "posted";
  lines: JournalLine[];
}

export interface AccountingPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "open" | "closed";
  outletId?: string | null;
  closedAt?: string | null;
  closedByUserId?: string | null;
}

interface AccountingState {
  accounts: Account[];
  journals: JournalEntry[];
  outlets: string[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  lastSyncAt: string | null;
  pagination: {
    accounts: AccountingListMeta | null;
    journals: AccountingListMeta | null;
    trialBalance: AccountingListMeta | null;
  } | null;
  trialBalanceRows: TrialBalanceReportRow[];
  accountingPeriods: AccountingPeriod[];
  accountingPeriodsLoading: boolean;
  accountingPeriodsSubmitting: boolean;
  accountingPeriodsError: string | null;
  accountingPeriodsPagination: AccountingListMeta | null;
  lastPeriodSyncAt: string | null;
  trialBalanceSummary: {
    totalDebit: number;
    totalCredit: number;
    balanced: boolean;
  } | null;
  trialBalanceParams: TrialBalanceQuery | null;
  ledgerReport: LedgerReportData;
  ledgerParams: LedgerQuery | null;
  profitLossCurrent: ProfitLossReportData;
  profitLossPrevious: ProfitLossReportData;
  profitLossParams: ProfitLossQuery | null;
  balanceSheetReport: BalanceSheetReportData;
  balanceSheetParams: BalanceSheetQuery | null;
  /** Loads chart of accounts and journals from the Laravel API (`/accounts`, `/journals`). */
  refreshFromApi: () => Promise<void>;
  revalidateBaseData: () => Promise<void>;
  fetchTrialBalanceReport: (params: TrialBalanceQuery) => Promise<TrialBalanceReportData>;
  fetchLedgerReport: (params: LedgerQuery) => Promise<LedgerReportData>;
  fetchProfitLossReport: (params: ProfitLossQuery) => Promise<{ current: ProfitLossReportData; previous: ProfitLossReportData }>;
  fetchBalanceSheetReport: (params: BalanceSheetQuery) => Promise<BalanceSheetReportData>;
  createAccountRemote: (payload: AccountCreatePayload) => Promise<void>;
  updateAccountRemote: (id: string, payload: AccountUpdatePayload) => Promise<void>;
  deleteAccountRemote: (id: string) => Promise<void>;
  createJournalRemote: (payload: JournalCreatePayload) => Promise<void>;
  updateJournalRemote: (id: string, payload: JournalUpdatePayload) => Promise<void>;
  deleteJournalRemote: (id: string) => Promise<void>;
  postJournalRemote: (id: string) => Promise<void>;
  fetchAccountingPeriods: (params?: { page?: number; perPage?: number }) => Promise<void>;
  createAccountingPeriod: (payload: AccountingPeriodCreatePayload) => Promise<void>;
  closeAccountingPeriod: (periodId: string) => Promise<void>;
  openAccountingPeriod: (periodId: string) => Promise<void>;
}

export type TrialBalanceQuery = {
  from?: string;
  to?: string;
  outlet?: string;
  page?: number;
  perPage?: number;
};

export type LedgerQuery = {
  accountId: string;
  from?: string;
  to?: string;
  outlet?: string;
};

export type ProfitLossQuery = {
  from?: string;
  to?: string;
  outlet?: string;
  compareFrom?: string;
  compareTo?: string;
};

export type BalanceSheetQuery = {
  to?: string;
  outlet?: string;
};

const EMPTY_LEDGER: LedgerReportData = { account: null, rows: [], opening: 0, closing: 0 };
const EMPTY_PL: ProfitLossReportData = {
  revenue: [],
  cogs: [],
  expenses: [],
  totalRevenue: 0,
  totalCOGS: 0,
  grossProfit: 0,
  totalExpenses: 0,
  netProfit: 0,
};
const EMPTY_BS: BalanceSheetReportData = {
  currentAssets: [],
  fixedAssets: [],
  shortLiab: [],
  longLiab: [],
  equity: [],
  totalAssets: 0,
  totalLiabilities: 0,
  totalEquity: 0,
  netProfit: 0,
  balanced: true,
};

function mapApiError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Accounting request failed";
}

function accountingPeriodFromApi(row: AccountingPeriodApiRow): AccountingPeriod {
  return {
    id: row.id,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    outletId: row.outletId ?? null,
    closedAt: row.closedAt ?? null,
    closedByUserId: row.closedByUserId ?? null,
  };
}

export const useAccountingStore = create<AccountingState>((set, get) => ({
  accounts: [],
  journals: [],
  outlets: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  lastSyncAt: null,
  pagination: {
    accounts: null,
    journals: null,
    trialBalance: null,
  },
  trialBalanceRows: [],
  accountingPeriods: [],
  accountingPeriodsLoading: false,
  accountingPeriodsSubmitting: false,
  accountingPeriodsError: null,
  accountingPeriodsPagination: null,
  lastPeriodSyncAt: null,
  trialBalanceSummary: null,
  trialBalanceParams: null,
  ledgerReport: EMPTY_LEDGER,
  ledgerParams: null,
  profitLossCurrent: EMPTY_PL,
  profitLossPrevious: EMPTY_PL,
  profitLossParams: null,
  balanceSheetReport: EMPTY_BS,
  balanceSheetParams: null,
  refreshFromApi: async () => {
    set({ isLoading: true, error: null });
    try {
      const [accRows, jourRows, outletRows] = await Promise.all([
        listAccountsWithMetaApi(),
        listJournalsWithMetaApi(),
        listOutletsApi(),
      ]);
      set((state) => ({
        accounts: accRows.items.map(accountFromApi),
        journals: jourRows.items.map(journalFromApi),
        outlets: outletRows.map((outlet) => outlet.name),
        lastSyncAt: new Date().toISOString(),
        pagination: {
          accounts: accRows.meta,
          journals: jourRows.meta,
          trialBalance: state.pagination?.trialBalance ?? null,
        },
      }));
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  revalidateBaseData: async () => {
    await get().refreshFromApi();
  },
  fetchTrialBalanceReport: async (params) => {
    set({ isLoading: true, error: null, trialBalanceParams: params });
    try {
      const data = await getTrialBalanceReportApi(params);
      const rows = data.rows.map(trialBalanceRowFromApi);
      set((state) => ({
        trialBalanceRows: rows,
        trialBalanceSummary: {
          totalDebit: data.totalDebit,
          totalCredit: data.totalCredit,
          balanced: data.balanced,
        },
        lastSyncAt: new Date().toISOString(),
        pagination: {
          accounts: state.pagination?.accounts ?? null,
          journals: state.pagination?.journals ?? null,
          trialBalance: {
            currentPage: params.page ?? 1,
            perPage: params.perPage ?? rows.length,
            total: rows.length,
            lastPage: 1,
          },
        },
      }));
      return data;
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  fetchLedgerReport: async (params) => {
    set({ isLoading: true, error: null, ledgerParams: params });
    try {
      const data = await getLedgerReportApi(params);
      set({
        ledgerReport: data,
        lastSyncAt: new Date().toISOString(),
      });
      return data;
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  fetchProfitLossReport: async (params) => {
    set({ isLoading: true, error: null, profitLossParams: params });
    try {
      const [current, previous] = await Promise.all([
        getProfitLossReportApi({ from: params.from, to: params.to, outlet: params.outlet }),
        getProfitLossReportApi({ from: params.compareFrom, to: params.compareTo, outlet: params.outlet }),
      ]);
      set({
        profitLossCurrent: current,
        profitLossPrevious: previous,
        lastSyncAt: new Date().toISOString(),
      });
      return { current, previous };
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  fetchBalanceSheetReport: async (params) => {
    set({ isLoading: true, error: null, balanceSheetParams: params });
    try {
      const data = await getBalanceSheetReportApi(params);
      set({
        balanceSheetReport: data,
        lastSyncAt: new Date().toISOString(),
      });
      return data;
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  createAccountRemote: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      await createAccountApi(payload);
      await get().refreshFromApi();
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
  updateAccountRemote: async (id, payload) => {
    set({ isSubmitting: true, error: null });
    try {
      await updateAccountApi(id, payload);
      await get().refreshFromApi();
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
  deleteAccountRemote: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      await deleteAccountApi(id);
      await get().refreshFromApi();
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
  createJournalRemote: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      await createJournalApi(payload);
      await get().refreshFromApi();
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
  updateJournalRemote: async (id, payload) => {
    set({ isSubmitting: true, error: null });
    try {
      await updateJournalApi(id, payload);
      await get().refreshFromApi();
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
  deleteJournalRemote: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      await deleteJournalApi(id);
      await get().refreshFromApi();
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
  postJournalRemote: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      await postJournalApi(id);
      await get().refreshFromApi();
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },
  fetchAccountingPeriods: async (params) => {
    const previousMeta = get().accountingPeriodsPagination;
    const page = params?.page ?? previousMeta?.currentPage ?? 1;
    const perPage = params?.perPage ?? previousMeta?.perPage ?? 10;
    set({ accountingPeriodsLoading: true, accountingPeriodsError: null });
    try {
      const response = await listAccountingPeriodsApi({ page, perPage });
      set({
        accountingPeriods: response.items.map(accountingPeriodFromApi),
        accountingPeriodsPagination: response.meta,
        lastPeriodSyncAt: new Date().toISOString(),
      });
    } catch (error) {
      set({ accountingPeriodsError: mapApiError(error) });
      throw error;
    } finally {
      set({ accountingPeriodsLoading: false });
    }
  },
  createAccountingPeriod: async (payload) => {
    set({ accountingPeriodsSubmitting: true, accountingPeriodsError: null });
    try {
      await createAccountingPeriodApi(payload);
      const currentMeta = get().accountingPeriodsPagination;
      await get().fetchAccountingPeriods({
        page: currentMeta?.currentPage ?? 1,
        perPage: currentMeta?.perPage ?? 10,
      });
    } catch (error) {
      set({ accountingPeriodsError: mapApiError(error) });
      throw error;
    } finally {
      set({ accountingPeriodsSubmitting: false });
    }
  },
  closeAccountingPeriod: async (periodId) => {
    set({ accountingPeriodsSubmitting: true, accountingPeriodsError: null });
    try {
      await closeAccountingPeriodApi(periodId);
      const currentMeta = get().accountingPeriodsPagination;
      await get().fetchAccountingPeriods({
        page: currentMeta?.currentPage ?? 1,
        perPage: currentMeta?.perPage ?? 10,
      });
    } catch (error) {
      set({ accountingPeriodsError: mapApiError(error) });
      throw error;
    } finally {
      set({ accountingPeriodsSubmitting: false });
    }
  },
  openAccountingPeriod: async (periodId) => {
    set({ accountingPeriodsSubmitting: true, accountingPeriodsError: null });
    try {
      await openAccountingPeriodApi(periodId);
      const currentMeta = get().accountingPeriodsPagination;
      await get().fetchAccountingPeriods({
        page: currentMeta?.currentPage ?? 1,
        perPage: currentMeta?.perPage ?? 10,
      });
    } catch (error) {
      set({ accountingPeriodsError: mapApiError(error) });
      throw error;
    } finally {
      set({ accountingPeriodsSubmitting: false });
    }
  },
}));

// ===== Helpers =====

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export interface ReportFilter {
  from?: string;
  to?: string;
  outlet?: string;
}

export function filterPostedJournals(journals: JournalEntry[], f: ReportFilter) {
  return journals.filter((j) => {
    if (j.status !== "posted") return false;
    if (f.from && j.date < f.from) return false;
    if (f.to && j.date > f.to) return false;
    if (f.outlet && f.outlet !== "all" && j.outlet !== f.outlet) return false;
    return true;
  });
}

export function accountBalance(accountId: string, journals: JournalEntry[], type: AccountType) {
  let debit = 0, credit = 0;
  journals.forEach((j) =>
    j.lines.forEach((l) => {
      if (l.accountId === accountId) {
        debit += l.debit;
        credit += l.credit;
      }
    }),
  );
  // Asset & expense are debit normal; liability, equity, revenue are credit normal
  if (type === "asset" || type === "expense") return debit - credit;
  return credit - debit;
}

export function buildPL(accounts: Account[], journals: JournalEntry[], f: ReportFilter) {
  const filtered = filterPostedJournals(journals, f);
  const revenue = accounts
    .filter((a) => a.type === "revenue")
    .map((a) => ({ account: a, amount: accountBalance(a.id, filtered, a.type) }));
  const cogs = accounts
    .filter((a) => a.subtype === "cogs")
    .map((a) => ({ account: a, amount: accountBalance(a.id, filtered, a.type) }));
  const expenses = accounts
    .filter((a) => a.type === "expense" && a.subtype !== "cogs")
    .map((a) => ({ account: a, amount: accountBalance(a.id, filtered, a.type) }));

  const totalRevenue = revenue.reduce((s, x) => s + x.amount, 0);
  const totalCOGS = cogs.reduce((s, x) => s + x.amount, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  return { revenue, cogs, expenses, totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit };
}

export function buildBalanceSheet(accounts: Account[], journals: JournalEntry[], f: ReportFilter) {
  const filtered = filterPostedJournals(journals, { ...f, from: undefined });
  const group = (subtype: AccountSubtype) =>
    accounts
      .filter((a) => a.subtype === subtype)
      .map((a) => ({ account: a, amount: accountBalance(a.id, filtered, a.type) }));

  const currentAssets = group("current_asset");
  const fixedAssets = group("fixed_asset");
  const shortLiab = group("short_term_liability");
  const longLiab = group("long_term_liability");
  const equity = group("equity");

  // Net profit rolls into equity for proper balance
  const pl = buildPL(accounts, journals, { ...f, from: undefined });
  const totalAssets =
    currentAssets.reduce((s, x) => s + x.amount, 0) + fixedAssets.reduce((s, x) => s + x.amount, 0);
  const totalLiabilities =
    shortLiab.reduce((s, x) => s + x.amount, 0) + longLiab.reduce((s, x) => s + x.amount, 0);
  const totalEquity = equity.reduce((s, x) => s + x.amount, 0) + pl.netProfit;

  return {
    currentAssets, fixedAssets, shortLiab, longLiab, equity,
    totalAssets, totalLiabilities, totalEquity,
    netProfit: pl.netProfit,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
  };
}

export function buildLedger(accountId: string, accounts: Account[], journals: JournalEntry[], f: ReportFilter) {
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return { account: null, rows: [], opening: 0, closing: 0 };

  const all = journals.filter((j) => j.status === "posted");
  // Opening balance = before from date
  const opening = f.from
    ? accountBalance(
        accountId,
        all.filter((j) => j.date < f.from! && (!f.outlet || f.outlet === "all" || j.outlet === f.outlet)),
        account.type,
      )
    : 0;

  const filtered = filterPostedJournals(journals, f).filter((j) =>
    j.lines.some((l) => l.accountId === accountId),
  );
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  let running = opening;
  const rows = filtered.flatMap((j) =>
    j.lines
      .filter((l) => l.accountId === accountId)
      .map((l) => {
        const delta =
          account.type === "asset" || account.type === "expense"
            ? l.debit - l.credit
            : l.credit - l.debit;
        running += delta;
        return {
          id: l.id, date: j.date, reference: j.reference || "", description: j.description,
          debit: l.debit, credit: l.credit, balance: running,
        };
      }),
  );
  return { account, rows, opening, closing: running };
}

export function computeTrialBalanceTotals(rows: TrialBalanceReportRow[]) {
  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);
  const delta = totalDebit - totalCredit;
  return {
    totalDebit,
    totalCredit,
    delta,
    balanced: Math.abs(delta) < 0.000001,
  };
}
