import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAccountingStore } from "@/stores/accountingStore";
import ChartOfAccounts from "./accounting/ChartOfAccounts";
import JournalEntries from "./accounting/JournalEntries";
import GeneralLedger from "./accounting/GeneralLedger";
import ProfitLoss from "./accounting/ProfitLoss";
import BalanceSheet from "./accounting/BalanceSheet";

export default function Accounting() {
  const refreshFromApi = useAccountingStore((s) => s.refreshFromApi);

  useEffect(() => {
    void refreshFromApi().catch((e) => {
      toast.error(e instanceof Error ? e.message : "Failed to load accounting data");
    });
  }, [refreshFromApi]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accounting & Financial Reports</h1>
        <p className="text-muted-foreground text-sm">
          Chart of accounts, journal entries, ledger and financial statements.
        </p>
      </div>
      <Tabs defaultValue="coa">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="coa">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="ledger">General Ledger</TabsTrigger>
          <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
        </TabsList>
        <TabsContent value="coa" className="mt-4"><ChartOfAccounts /></TabsContent>
        <TabsContent value="journal" className="mt-4"><JournalEntries /></TabsContent>
        <TabsContent value="ledger" className="mt-4"><GeneralLedger /></TabsContent>
        <TabsContent value="pl" className="mt-4"><ProfitLoss /></TabsContent>
        <TabsContent value="bs" className="mt-4"><BalanceSheet /></TabsContent>
      </Tabs>
    </div>
  );
}
