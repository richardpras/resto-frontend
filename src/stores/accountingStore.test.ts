import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeTrialBalanceTotals, useAccountingStore } from "./accountingStore";

const mockListAccountsWithMeta = vi.fn();
const mockListJournalsWithMeta = vi.fn();
const mockListOutlets = vi.fn();
const mockGetTrialBalanceReport = vi.fn();
const mockListAccountingPeriods = vi.fn();
const mockCreateAccountingPeriod = vi.fn();
const mockCloseAccountingPeriod = vi.fn();
const mockOpenAccountingPeriod = vi.fn();

vi.mock("@/lib/api-integration/accountingEndpoints", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-integration/accountingEndpoints")>(
      "@/lib/api-integration/accountingEndpoints",
    );
  return {
    ...actual,
    listAccountsWithMeta: (...args: unknown[]) => mockListAccountsWithMeta(...args),
    listJournalsWithMeta: (...args: unknown[]) => mockListJournalsWithMeta(...args),
    listOutlets: (...args: unknown[]) => mockListOutlets(...args),
    getTrialBalanceReport: (...args: unknown[]) => mockGetTrialBalanceReport(...args),
    listAccountingPeriods: (...args: unknown[]) => mockListAccountingPeriods(...args),
    createAccountingPeriod: (...args: unknown[]) => mockCreateAccountingPeriod(...args),
    closeAccountingPeriod: (...args: unknown[]) => mockCloseAccountingPeriod(...args),
    openAccountingPeriod: (...args: unknown[]) => mockOpenAccountingPeriod(...args),
  };
});

function resetState() {
  useAccountingStore.setState({
    accounts: [],
    journals: [],
    outlets: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
    lastSyncAt: null,
    pagination: null,
    trialBalanceRows: [],
    trialBalanceParams: null,
    trialBalanceSummary: null,
    accountingPeriods: [],
    accountingPeriodsLoading: false,
    accountingPeriodsSubmitting: false,
    accountingPeriodsError: null,
    accountingPeriodsPagination: null,
    lastPeriodSyncAt: null,
  });
}

describe("accountingStore async lifecycle", () => {
  beforeEach(() => {
    resetState();
    mockListAccountsWithMeta.mockReset();
    mockListJournalsWithMeta.mockReset();
    mockListOutlets.mockReset();
    mockGetTrialBalanceReport.mockReset();
    mockListAccountingPeriods.mockReset();
    mockCreateAccountingPeriod.mockReset();
    mockCloseAccountingPeriod.mockReset();
    mockOpenAccountingPeriod.mockReset();
  });

  it("fetches trial balance and stores rows + filters + sync markers", async () => {
    mockGetTrialBalanceReport.mockResolvedValueOnce({
      rows: [
        { accountId: "acc-1", code: "1101", name: "Cash", debit: 500000, credit: 0 },
        { accountId: "acc-2", code: "4101", name: "Sales", debit: 0, credit: 500000 },
      ],
      totalDebit: 500000,
      totalCredit: 500000,
      balanced: true,
    });

    await useAccountingStore.getState().fetchTrialBalanceReport({
      from: "2026-05-01",
      to: "2026-05-31",
      outlet: "Main",
      perPage: 20,
      page: 1,
    });

    const state = useAccountingStore.getState();
    expect(mockGetTrialBalanceReport).toHaveBeenCalledWith({
      from: "2026-05-01",
      to: "2026-05-31",
      outlet: "Main",
      perPage: 20,
      page: 1,
    });
    expect(state.trialBalanceRows).toHaveLength(2);
    expect(state.trialBalanceSummary?.balanced).toBe(true);
    expect(state.lastSyncAt).not.toBeNull();
    expect(state.trialBalanceParams?.outlet).toBe("Main");
  });

  it("computes basic trial balance aggregation integrity path", () => {
    const totals = computeTrialBalanceTotals([
      { accountId: "a", code: "1101", name: "Cash", debit: 200000, credit: 0 },
      { accountId: "b", code: "1201", name: "Bank", debit: 300000, credit: 0 },
      { accountId: "c", code: "4101", name: "Sales", debit: 0, credit: 500000 },
    ]);

    expect(totals.totalDebit).toBe(500000);
    expect(totals.totalCredit).toBe(500000);
    expect(totals.delta).toBe(0);
    expect(totals.balanced).toBe(true);
  });

  it("revalidates periods after create and preserves pagination context", async () => {
    mockCreateAccountingPeriod.mockResolvedValueOnce({
      id: "1",
      name: "May 2026",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
      status: "open",
    });
    mockListAccountingPeriods.mockResolvedValueOnce({
      items: [
        {
          id: "1",
          name: "May 2026",
          startDate: "2026-05-01",
          endDate: "2026-05-31",
          status: "open",
        },
      ],
      meta: { currentPage: 2, perPage: 20, total: 21, lastPage: 2 },
    });

    useAccountingStore.setState({
      accountingPeriodsPagination: { currentPage: 2, perPage: 20, total: 20, lastPage: 2 },
    });

    await useAccountingStore.getState().createAccountingPeriod({
      name: "May 2026",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });

    expect(mockCreateAccountingPeriod).toHaveBeenCalledTimes(1);
    expect(mockListAccountingPeriods).toHaveBeenCalledWith({ page: 2, perPage: 20 });
    expect(useAccountingStore.getState().accountingPeriodsPagination?.currentPage).toBe(2);
    expect(useAccountingStore.getState().accountingPeriods).toHaveLength(1);
  });

  it("revalidates periods after close/open lifecycle actions", async () => {
    mockCloseAccountingPeriod.mockResolvedValueOnce({
      id: "1",
      name: "May 2026",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
      status: "closed",
    });
    mockOpenAccountingPeriod.mockResolvedValueOnce({
      id: "1",
      name: "May 2026",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
      status: "open",
    });
    mockListAccountingPeriods
      .mockResolvedValueOnce({
        items: [{ id: "1", name: "May 2026", startDate: "2026-05-01", endDate: "2026-05-31", status: "closed" }],
        meta: { currentPage: 1, perPage: 10, total: 1, lastPage: 1 },
      })
      .mockResolvedValueOnce({
        items: [{ id: "1", name: "May 2026", startDate: "2026-05-01", endDate: "2026-05-31", status: "open" }],
        meta: { currentPage: 1, perPage: 10, total: 1, lastPage: 1 },
      });

    await useAccountingStore.getState().closeAccountingPeriod("1");
    expect(mockCloseAccountingPeriod).toHaveBeenCalledWith("1");
    expect(useAccountingStore.getState().accountingPeriods[0]?.status).toBe("closed");

    await useAccountingStore.getState().openAccountingPeriod("1");
    expect(mockOpenAccountingPeriod).toHaveBeenCalledWith("1");
    expect(useAccountingStore.getState().accountingPeriods[0]?.status).toBe("open");
  });
});
