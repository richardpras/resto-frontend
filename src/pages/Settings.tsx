import { useEffect, useState } from "react";
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
import { ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { ApiHttpError, getApiAccessToken, setApiAccessToken } from "@/lib/api-integration/client";
import { toast } from "sonner";

export default function Settings() {
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("merchant");

  const loadTabData = async (tab: string, force = false) => {
    const sectionsByTab: Record<string, string[]> = {
      merchant: ["merchant"],
      outlets: ["outlets"],
      taxes: ["taxes"],
      printers: ["printers", "outlets"],
      payments: ["paymentMethods"],
      system: ["system"],
      integration: ["integration"],
      numbering: ["numbering", "outlets"],
      banks: ["banks"],
      receipt: ["outletReceiptRows"],
    };
    const sections = sectionsByTab[tab] ?? ["merchant"];
    await useSettingsStore.getState().ensureSectionsLoaded(sections, {
      force,
      staleMs: force ? 0 : 90_000,
    });
  };

  useEffect(() => {
    if (!getApiAccessToken()) return;
    let cancelled = false;
    (async () => {
      try {
        await loadTabData(activeTab);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiHttpError) {
          if (e.status === 401) {
            setApiAccessToken(undefined);
            toast.error("Not authenticated. Sign in to load settings from the server.");
          } else if (e.status === 403) {
            toast.error("You do not have permission to view settings (settings.view).");
          } else {
            toast.error(e.message);
          }
        } else {
          toast.error("Failed to load settings from API.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const reloadFromServer = async () => {
    if (!getApiAccessToken()) {
      toast.message("Not signed in", { description: "Open /login or set VITE_API_ACCESS_TOKEN to sync with the API." });
      return;
    }
    setSyncing(true);
    try {
      await loadTabData(activeTab, true);
      toast.success("Settings reloaded from server");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Reload failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Configure merchant, outlets, taxes, printers and system behavior.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={syncing}
            aria-label="Reload settings from server"
            onClick={() => void reloadFromServer()}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Reload from server</span>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/users"><ExternalLink className="h-4 w-4 mr-2" />Users & Permissions</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/login?redirect=/settings">Sign in</Link>
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab);
        }}
        className="w-full"
      >
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
        <TabsContent value="merchant" className="mt-4">{activeTab === "merchant" ? <MerchantSettings /> : null}</TabsContent>
        <TabsContent value="outlets" className="mt-4">{activeTab === "outlets" ? <OutletsSettings /> : null}</TabsContent>
        <TabsContent value="taxes" className="mt-4">{activeTab === "taxes" ? <TaxSettings /> : null}</TabsContent>
        <TabsContent value="printers" className="mt-4">{activeTab === "printers" ? <PrinterSettings /> : null}</TabsContent>
        <TabsContent value="payments" className="mt-4">{activeTab === "payments" ? <PaymentMethodSettings /> : null}</TabsContent>
        <TabsContent value="system" className="mt-4">{activeTab === "system" ? <SystemSettings /> : null}</TabsContent>
        <TabsContent value="integration" className="mt-4">{activeTab === "integration" ? <IntegrationSettings /> : null}</TabsContent>
        <TabsContent value="numbering" className="mt-4">{activeTab === "numbering" ? <NumberingSettings /> : null}</TabsContent>
        <TabsContent value="banks" className="mt-4">{activeTab === "banks" ? <BankSettings /> : null}</TabsContent>
        <TabsContent value="receipt" className="mt-4">{activeTab === "receipt" ? <ReceiptSettings /> : null}</TabsContent>
      </Tabs>
    </div>
  );
}
