import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const accountingPage = readFileSync(path.resolve(__dirname, "Accounting.tsx"), "utf-8");
const generalLedgerPage = readFileSync(path.resolve(__dirname, "accounting/GeneralLedger.tsx"), "utf-8");
const profitLossPage = readFileSync(path.resolve(__dirname, "accounting/ProfitLoss.tsx"), "utf-8");
const trialBalancePage = readFileSync(path.resolve(__dirname, "accounting/TrialBalance.tsx"), "utf-8");
const balanceSheetPage = readFileSync(path.resolve(__dirname, "accounting/BalanceSheet.tsx"), "utf-8");
const cashFlowPage = readFileSync(path.resolve(__dirname, "accounting/CashFlow.tsx"), "utf-8");

const FINANCIAL_REPORT_COMPONENTS = [
  generalLedgerPage,
  profitLossPage,
  trialBalancePage,
  balanceSheetPage,
  cashFlowPage,
];

describe("Accounting financial statement tab permissions", () => {
  it("gates financial report tabs with canViewFinancialStatements", () => {
    expect(accountingPage).toMatch(/canViewFinancialStatements/);
    expect(accountingPage).toMatch(/showFinancialStatements/);
    expect(accountingPage).toMatch(/FINANCIAL_STATEMENT_TABS/);
    expect(accountingPage).toMatch(/"ledger", "tb", "pl", "bs", "cf"/);
    expect(accountingPage).toMatch(/showFinancialStatements &&/);
  });

  it("keeps operational tabs unconditionally rendered", () => {
    expect(accountingPage).toMatch(/TabsContent value="coa"/);
    expect(accountingPage).toMatch(/TabsContent value="journal"/);
    expect(accountingPage).toMatch(/TabsContent value="periods"/);
    expect(accountingPage).toMatch(/TabsContent value="health"/);
    expect(accountingPage).toMatch(/TabsContent value="recon"/);
    expect(accountingPage).toMatch(
      /OPERATIONAL_TAB_ORDER: AccountingTabKey\[\] = \[[\s\S]*?"health",[\s\n\r]*"recon"/,
    );
  });

  it("renders General Ledger inside financial statement gate", () => {
    expect(accountingPage).toMatch(/showFinancialStatements &&[\s\S]*TabsContent value="ledger"/);
  });

  it("guards each financial report component before API fetch", () => {
    for (const source of FINANCIAL_REPORT_COMPONENTS) {
      expect(source).toMatch(/canViewFinancialStatements/);
      expect(source).toMatch(/if \(!allowed\)/);
      expect(source).toMatch(/accounting\.financialStatementRestricted/);
    }
  });
});
