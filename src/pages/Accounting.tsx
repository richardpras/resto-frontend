import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { useAccountingStore } from "@/stores/accountingStore";
import { useAuthStore } from "@/stores/authStore";
import { canViewFinancialStatements } from "@/domain/permissionGates";
import ChartOfAccounts from "./accounting/ChartOfAccounts";
import JournalEntries from "./accounting/JournalEntries";
import GeneralLedger from "./accounting/GeneralLedger";
import ProfitLoss from "./accounting/ProfitLoss";
import BalanceSheet from "./accounting/BalanceSheet";
import TrialBalance from "./accounting/TrialBalance";
import AccountingPeriods from "./accounting/AccountingPeriods";
import AccountingHealth from "./accounting/AccountingHealth";
import CashFlow from "./accounting/CashFlow";
import AccountingReconciliation from "./accounting/AccountingReconciliation";

type AccountingTabKey =
  | "coa"
  | "journal"
  | "periods"
  | "health"
  | "ledger"
  | "tb"
  | "pl"
  | "bs"
  | "cf"
  | "recon";

const FINANCIAL_STATEMENT_TABS: AccountingTabKey[] = ["ledger", "tb", "pl", "bs", "cf"];

const OPERATIONAL_TAB_ORDER: AccountingTabKey[] = [
  "coa",
  "journal",
  "periods",
  "health",
  "recon",
];

const ACCOUNTING_TAB_KEYS: AccountingTabKey[] = [
  "coa",
  "journal",
  "periods",
  "health",
  "ledger",
  "tb",
  "pl",
  "bs",
  "cf",
  "recon",
];

export default function Accounting() {
  const { t } = useErpTranslation();
  const [searchParams] = useSearchParams();
  const refreshFromApi = useAccountingStore((s) => s.refreshFromApi);
  const user = useAuthStore((s) => s.user);
  const showFinancialStatements = useMemo(() => canViewFinancialStatements(user), [user]);

  const visibleTabs = useMemo(() => {
    const tabs: AccountingTabKey[] = [...OPERATIONAL_TAB_ORDER];
    if (showFinancialStatements) {
      const reconIndex = tabs.indexOf("recon");
      tabs.splice(reconIndex, 0, ...FINANCIAL_STATEMENT_TABS);
    }
    return tabs;
  }, [showFinancialStatements]);

  const requestedTab = searchParams.get("tab");
  const resolvedDefaultTab =
    requestedTab && ACCOUNTING_TAB_KEYS.includes(requestedTab as AccountingTabKey) && visibleTabs.includes(requestedTab as AccountingTabKey)
      ? (requestedTab as AccountingTabKey)
      : (visibleTabs[0] ?? "coa");

  const [activeTab, setActiveTab] = useState<AccountingTabKey>(resolvedDefaultTab);

  useEffect(() => {
    setActiveTab(resolvedDefaultTab);
  }, [resolvedDefaultTab]);

  useEffect(() => {
    void refreshFromApi().catch((e) => {
      toast.error(formatApiErrorMessage(e, t) || t("accounting.loadFailed"));
    });
  }, [refreshFromApi, t]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("accounting.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("accounting.subtitle")}</p>
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AccountingTabKey)}>
        <TabsList className="flex-wrap h-auto">
          {visibleTabs.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`accounting.tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="coa" className="mt-4"><ChartOfAccounts /></TabsContent>
        <TabsContent value="journal" className="mt-4"><JournalEntries /></TabsContent>
        <TabsContent value="periods" className="mt-4"><AccountingPeriods /></TabsContent>
        <TabsContent value="health" className="mt-4"><AccountingHealth /></TabsContent>
        {showFinancialStatements && (
          <>
            <TabsContent value="ledger" className="mt-4"><GeneralLedger /></TabsContent>
            <TabsContent value="tb" className="mt-4"><TrialBalance /></TabsContent>
            <TabsContent value="pl" className="mt-4"><ProfitLoss /></TabsContent>
            <TabsContent value="bs" className="mt-4"><BalanceSheet /></TabsContent>
            <TabsContent value="cf" className="mt-4"><CashFlow /></TabsContent>
          </>
        )}
        <TabsContent value="recon" className="mt-4"><AccountingReconciliation /></TabsContent>
      </Tabs>
    </div>
  );
}
