import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Package, PackageCheck, Receipt, Wallet, ArrowRight } from "lucide-react";
import PurchaseRequests from "./PurchaseRequests";
import PurchaseOrders from "./PurchaseOrders";
import GoodsReceipts from "./GoodsReceipts";
import PurchaseInvoices from "./PurchaseInvoices";
import PurchasePayments from "./PurchasePayments";
import ProcurementThreeWayMatch from "./ProcurementThreeWayMatch";

export default function Purchases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") ?? "pr");

  useEffect(() => {
    const next = searchParams.get("tab");
    if (next && next !== tab) setTab(next);
  }, [searchParams, tab]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Flow visualization */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-3 px-4 bg-muted/30 rounded-xl border border-border/50">
        <span className={`px-2.5 py-1 rounded-md font-medium transition-colors ${tab === "pr" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
          PR
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className={`px-2.5 py-1 rounded-md font-medium transition-colors ${tab === "po" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
          PO
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className={`px-2.5 py-1 rounded-md font-medium transition-colors ${tab === "grn" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
          GRN
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className={`px-2.5 py-1 rounded-md font-medium transition-colors ${tab === "inv" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
          Invoice
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className={`px-2.5 py-1 rounded-md font-medium transition-colors ${tab === "pay" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
          Payment
        </span>
      </div>

      <Tabs value={tab} onValueChange={(value) => { setTab(value); setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("tab", value); return p; }); }}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pr" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Purchase</span> Requests
          </TabsTrigger>
          <TabsTrigger value="po" className="gap-1.5 text-xs sm:text-sm">
            <Package className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Purchase</span> Orders
          </TabsTrigger>
          <TabsTrigger value="grn" className="gap-1.5 text-xs sm:text-sm">
            <PackageCheck className="h-3.5 w-3.5" /> Goods Receipt
          </TabsTrigger>
          <TabsTrigger value="inv" className="gap-1.5 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="match" className="gap-1.5 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5" /> 3-Way Match
          </TabsTrigger>
          <TabsTrigger value="pay" className="gap-1.5 text-xs sm:text-sm">
            <Wallet className="h-3.5 w-3.5" /> Payments
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pr"><PurchaseRequests /></TabsContent>
        <TabsContent value="po"><PurchaseOrders /></TabsContent>
        <TabsContent value="grn"><GoodsReceipts /></TabsContent>
        <TabsContent value="inv"><PurchaseInvoices /></TabsContent>
        <TabsContent value="match"><ProcurementThreeWayMatch /></TabsContent>
        <TabsContent value="pay"><PurchasePayments /></TabsContent>
      </Tabs>
    </div>
  );
}
