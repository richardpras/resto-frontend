import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const accountingPage = readFileSync(path.resolve(__dirname, "Accounting.tsx"), "utf-8");
const chartPage = readFileSync(path.resolve(__dirname, "accounting/ChartOfAccounts.tsx"), "utf-8");
const journalPage = readFileSync(path.resolve(__dirname, "accounting/JournalEntries.tsx"), "utf-8");
const ledgerPage = readFileSync(path.resolve(__dirname, "accounting/GeneralLedger.tsx"), "utf-8");
const plPage = readFileSync(path.resolve(__dirname, "accounting/ProfitLoss.tsx"), "utf-8");
const bsPage = readFileSync(path.resolve(__dirname, "accounting/BalanceSheet.tsx"), "utf-8");
const trialBalancePage = readFileSync(path.resolve(__dirname, "accounting/TrialBalance.tsx"), "utf-8");
const periodsPage = readFileSync(path.resolve(__dirname, "accounting/AccountingPeriods.tsx"), "utf-8");

describe("Accounting pages store boundary regression", () => {
  it("does not import accounting APIs directly in accounting pages", () => {
    const sources = [chartPage, journalPage, ledgerPage, plPage, bsPage, trialBalancePage, periodsPage];
    sources.forEach((source) => {
      expect(source).not.toMatch(/from\s+["']@\/lib\/api["']/);
      expect(source).not.toMatch(/from\s+["']@\/lib\/api-integration\/accountingEndpoints["']/);
    });
  });

  it("wires accounting shell and pages via accounting store actions only", () => {
    expect(accountingPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.refreshFromApi\)/);
    expect(chartPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.createAccountRemote\)/);
    expect(chartPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.updateAccountRemote\)/);
    expect(chartPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.deleteAccountRemote\)/);
    expect(chartPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.revalidateBaseData\)/);

    expect(journalPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.createJournalRemote\)/);
    expect(journalPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.updateJournalRemote\)/);
    expect(journalPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.deleteJournalRemote\)/);
    expect(journalPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.postJournalRemote\)/);
    expect(journalPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.revalidateBaseData\)/);

    expect(ledgerPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.fetchLedgerReport\)/);
    expect(plPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.fetchProfitLossReport\)/);
    expect(bsPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.fetchBalanceSheetReport\)/);
    expect(trialBalancePage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.fetchTrialBalanceReport\)/);
    expect(periodsPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.fetchAccountingPeriods\)/);
    expect(periodsPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.createAccountingPeriod\)/);
    expect(periodsPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.closeAccountingPeriod\)/);
    expect(periodsPage).toMatch(/useAccountingStore\(\(s\)\s*=>\s*s\.openAccountingPeriod\)/);
  });
});
