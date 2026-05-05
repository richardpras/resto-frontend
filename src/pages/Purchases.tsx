import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Package, PackageCheck, Receipt, ArrowRight } from "lucide-react";
import PurchaseRequests from "./PurchaseRequests";
import PurchaseOrders from "./PurchaseOrders";
import GoodsReceipts from "./GoodsReceipts";
import PurchaseInvoices from "./PurchaseInvoices";

export default function Purchases() {
  const [tab, setTab] = useState("pr");

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
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
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
        </TabsList>
        <TabsContent value="pr"><PurchaseRequests /></TabsContent>
        <TabsContent value="po"><PurchaseOrders /></TabsContent>
        <TabsContent value="grn"><GoodsReceipts /></TabsContent>
        <TabsContent value="inv"><PurchaseInvoices /></TabsContent>
      </Tabs>
    </div>
  );
}
