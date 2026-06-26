import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabsList } from "@/components/ui/ScrollableTabsList";
import { FileText, Package, PackageCheck, Receipt, Wallet, ArrowRight, BarChart3 } from "lucide-react";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import PurchaseRequests from "./PurchaseRequests";
import PurchaseOrders from "./PurchaseOrders";
import GoodsReceipts from "./GoodsReceipts";
import PurchaseInvoices from "./PurchaseInvoices";
import PurchasePayments from "./PurchasePayments";
import ProcurementThreeWayMatch from "./ProcurementThreeWayMatch";
import ProcurementPosting from "./ProcurementPosting";
import ProcurementAnalytics from "./ProcurementAnalytics";

type PurchaseTab = "pr" | "po" | "grn" | "inv" | "pay";

const FLOW_STEPS: { key: PurchaseTab; flowKey: "pr" | "po" | "grn" | "invoice" | "payment" }[] = [
  { key: "pr", flowKey: "pr" },
  { key: "po", flowKey: "po" },
  { key: "grn", flowKey: "grn" },
  { key: "inv", flowKey: "invoice" },
  { key: "pay", flowKey: "payment" },
];

export default function Purchases() {
  const { t } = useErpTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") ?? "pr");

  useEffect(() => {
    const next = searchParams.get("tab");
    if (next && next !== tab) setTab(next);
  }, [searchParams, tab]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-3 px-4 bg-muted/30 rounded-xl border border-border/50">
        {FLOW_STEPS.map((step, index) => (
          <span key={step.key} className="contents">
            {index > 0 ? <ArrowRight className="h-3 w-3" /> : null}
            <span
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                tab === step.key ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              {t(`purchases.flow.${step.flowKey}`)}
            </span>
          </span>
        ))}
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value);
          setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            p.set("tab", value);
            return p;
          });
        }}
      >
        <ScrollableTabsList>
          <TabsTrigger value="pr" className="gap-1.5 text-sm shrink-0 px-4 min-h-10">
            <FileText className="h-3.5 w-3.5" /> {t("purchases.tabs.pr")}
          </TabsTrigger>
          <TabsTrigger value="po" className="gap-1.5 text-sm shrink-0 px-4 min-h-10">
            <Package className="h-3.5 w-3.5" /> {t("purchases.tabs.po")}
          </TabsTrigger>
          <TabsTrigger value="grn" className="gap-1.5 text-sm shrink-0 px-4 min-h-10">
            <PackageCheck className="h-3.5 w-3.5" /> {t("purchases.tabs.grn")}
          </TabsTrigger>
          <TabsTrigger value="inv" className="gap-1.5 text-sm shrink-0 px-4 min-h-10">
            <Receipt className="h-3.5 w-3.5" /> {t("purchases.tabs.inv")}
          </TabsTrigger>
          <TabsTrigger value="match" className="gap-1.5 text-sm shrink-0 px-4 min-h-10">
            <Receipt className="h-3.5 w-3.5" /> {t("purchases.tabs.match")}
          </TabsTrigger>
          <TabsTrigger value="posting" className="gap-1.5 text-sm shrink-0 px-4 min-h-10">
            <Receipt className="h-3.5 w-3.5" /> {t("purchases.tabs.posting")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-sm shrink-0 px-4 min-h-10">
            <BarChart3 className="h-3.5 w-3.5" /> {t("purchases.tabs.analytics")}
          </TabsTrigger>
          <TabsTrigger value="pay" className="gap-1.5 text-sm shrink-0 px-4 min-h-10">
            <Wallet className="h-3.5 w-3.5" /> {t("purchases.tabs.pay")}
          </TabsTrigger>
        </ScrollableTabsList>
        <TabsContent value="pr"><PurchaseRequests /></TabsContent>
        <TabsContent value="po"><PurchaseOrders /></TabsContent>
        <TabsContent value="grn"><GoodsReceipts /></TabsContent>
        <TabsContent value="inv"><PurchaseInvoices /></TabsContent>
        <TabsContent value="match"><ProcurementThreeWayMatch /></TabsContent>
        <TabsContent value="posting"><ProcurementPosting /></TabsContent>
        <TabsContent value="analytics"><ProcurementAnalytics /></TabsContent>
        <TabsContent value="pay"><PurchasePayments /></TabsContent>
      </Tabs>
    </div>
  );
}
