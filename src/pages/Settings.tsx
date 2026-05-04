import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MerchantSettings from "./settings/MerchantSettings";
import OutletsSettings from "./settings/OutletsSettings";
import TaxSettings from "./settings/TaxSettings";
import PrinterSettings from "./settings/PrinterSettings";
import PaymentMethodSettings from "./settings/PaymentMethodSettings";
import SystemSettings from "./settings/SystemsSettings";
import IntegrationSettings from "./settings/IntegrationSettings";
import NumberingSettings from "./settings/NumberingSettings";
import BankSettings from "./settings/BankSettings";
import ReceiptSettings from "./settings/ReceiptsSettings";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function Settings() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Configure merchant, outlets, taxes, printers and system behavior.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/users"><ExternalLink className="h-4 w-4 mr-2" />Users & Permissions</Link>
        </Button>
      </div>

      <Tabs defaultValue="merchant" className="w-full">
        <TabsList className="flex flex-wrap h-auto justify-start">
          <TabsTrigger value="merchant">Merchant</TabsTrigger>
          <TabsTrigger value="outlets">Outlets</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="printers">Printers</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="integration">Integrations</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
          <TabsTrigger value="banks">Bank Accounts</TabsTrigger>
          <TabsTrigger value="receipt">Receipts</TabsTrigger>
        </TabsList>
        <TabsContent value="merchant" className="mt-4"><MerchantSettings /></TabsContent>
        <TabsContent value="outlets" className="mt-4"><OutletsSettings /></TabsContent>
        <TabsContent value="taxes" className="mt-4"><TaxSettings /></TabsContent>
        <TabsContent value="printers" className="mt-4"><PrinterSettings /></TabsContent>
        <TabsContent value="payments" className="mt-4"><PaymentMethodSettings /></TabsContent>
        <TabsContent value="system" className="mt-4"><SystemSettings /></TabsContent>
        <TabsContent value="integration" className="mt-4"><IntegrationSettings /></TabsContent>
        <TabsContent value="numbering" className="mt-4"><NumberingSettings /></TabsContent>
        <TabsContent value="banks" className="mt-4"><BankSettings /></TabsContent>
        <TabsContent value="receipt" className="mt-4"><ReceiptSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
