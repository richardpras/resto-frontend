import { create } from "zustand";
import { listAccounts as listAccountsApi, listJournals as listJournalsApi, listOutlets as listOutletsApi } from "@/lib/api";
import { accountFromApi, journalFromApi } from "@/lib/accountingMappers";

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

interface AccountingState {
  accounts: Account[];
  journals: JournalEntry[];
  outlets: string[];
  /** Loads chart of accounts and journals from the Laravel API (`/accounts`, `/journals`). */
  refreshFromApi: () => Promise<void>;
}

export const useAccountingStore = create<AccountingState>((set) => ({
  accounts: [],
  journals: [],
  outlets: [],
  refreshFromApi: async () => {
    const [accRows, jourRows, outletRows] = await Promise.all([listAccountsApi(), listJournalsApi(), listOutletsApi()]);
    set({
      accounts: accRows.map(accountFromApi),
      journals: jourRows.map(journalFromApi),
      outlets: outletRows.map((outlet) => outlet.name),
    });
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
