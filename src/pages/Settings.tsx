import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabsList } from "@/components/ui/ScrollableTabsList";
import MerchantSettings from "./settings/MerchantSettings";
import OutletsSettings from "./settings/OutletsSettings";
import TaxSettings from "./settings/TaxSettings";
import PrinterSettings from "./settings/PrinterSettings";
import PaymentSettingsSectionTabs from "./settings/PaymentSettingsSectionTabs";
import { normalizeSettingsTabKey, settingsTabToUrlParam } from "./settings/paymentSettingsSections";
import SystemSettings from "./settings/SystemsSettings";
import IntegrationSettings from "./settings/IntegrationSettings";
import NumberingSettings from "./settings/NumberingSettings";
import BankSettings from "./settings/BankSettings";
import ReceiptSettings from "./settings/ReceiptsSettings";
import WarehouseSettings from "./settings/WarehouseSettings";
import { AdminPageShell } from "@/components/layout/AdminPageShell";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { ApiHttpError, getApiAccessToken, setApiAccessToken } from "@/lib/api-integration/client";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import {
  canViewSettingsTab,
  canAccessUsersAdmin,
  type SettingsTabKey,
} from "@/domain/permissionGates";

const SETTINGS_TAB_KEYS = [
  "merchant",
  "outlets",
  "taxes",
  "printers",
  "numbering",
  "receipt",
  "warehouses",
  "banks",
  "payments",
  "system",
  "integration",
] as const satisfies readonly SettingsTabKey[];

export default function Settings() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const [syncing, setSyncing] = useState(false);
  const requestedTab = normalizeSettingsTabKey(searchParams.get("tab"));
  const initialTab =
    requestedTab && (SETTINGS_TAB_KEYS as readonly string[]).includes(requestedTab) ? requestedTab : "merchant";
  const [activeTab, setActiveTab] = useState(initialTab);
  const authUser = useAuthStore((s) => s.user);
  const visibleTabs = SETTINGS_TAB_KEYS.filter((tab) => canViewSettingsTab(tab, authUser));
  const showUsersLink = canAccessUsersAdmin(authUser);

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.includes(activeTab as SettingsTabKey)) {
      const fallback = visibleTabs[0];
      setActiveTab(fallback);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("tab", settingsTabToUrlParam(fallback));
          return params;
        },
        { replace: true },
      );
    }
  }, [activeTab, setSearchParams, visibleTabs]);

  useEffect(() => {
    const normalized = normalizeSettingsTabKey(searchParams.get("tab"));
    if (normalized && (SETTINGS_TAB_KEYS as readonly string[]).includes(normalized)) {
      setActiveTab(normalized);
    }
  }, [searchParams]);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    const normalized = normalizeSettingsTabKey(urlTab);
    if (normalized === "payments" && !searchParams.get("section")) {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("tab", settingsTabToUrlParam("payments"));
          params.set("section", "outlet");
          return params;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const loadTabData = async (tab: string, force = false) => {
    const sectionsByTab: Record<string, string[]> = {
      merchant: ["merchant"],
      outlets: ["outlets"],
      taxes: ["taxes"],
      printers: ["printers"],
      payments: ["paymentMethods", "outlets"],
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
            toast.error(t("settings.notAuthenticated"));
          } else if (e.status === 403) {
            toast.error(t("settings.noPermission"));
          } else {
            toast.error(e.message);
          }
        } else {
          toast.error(t("settings.loadFailed"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, t]);

  const reloadFromServer = async () => {
    if (!getApiAccessToken()) {
      toast.message(t("settings.notSignedInTitle"), { description: t("settings.notSignedInDesc") });
      return;
    }
    setSyncing(true);
    try {
      await loadTabData(activeTab, true);
      toast.success(t("settings.reloaded"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("settings.reloadFailed"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminPageShell className="space-y-6" maxWidth="7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("settings.pageTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("settings.pageSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={syncing}
            aria-label={t("settings.reloadAria")}
            onClick={() => void reloadFromServer()}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">{t("settings.reloadFromServer")}</span>
          </Button>
          {showUsersLink ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/users"><ExternalLink className="h-4 w-4 mr-2" />{t("settings.usersPermissions")}</Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="sm">
            <Link to="/login?redirect=/settings">{t("settings.signIn")}</Link>
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab);
          setSearchParams((prev) => {
            const params = new URLSearchParams(prev);
            params.set("tab", settingsTabToUrlParam(tab));
            if (tab === "payments") {
              params.set("section", prev.get("section") === "master" ? "master" : "outlet");
            } else {
              params.delete("section");
            }
            return params;
          });
        }}
        className="w-full"
      >
        <ScrollableTabsList>
          {visibleTabs.includes("merchant") ? <TabsTrigger value="merchant" className="shrink-0 px-4 min-h-10">{t("settings.tabs.merchant")}</TabsTrigger> : null}
          {visibleTabs.includes("outlets") ? <TabsTrigger value="outlets" className="shrink-0 px-4 min-h-10">{t("settings.tabs.outlets")}</TabsTrigger> : null}
          {visibleTabs.includes("taxes") ? <TabsTrigger value="taxes" className="shrink-0 px-4 min-h-10">{t("settings.tabs.taxes")}</TabsTrigger> : null}
          {visibleTabs.includes("printers") ? <TabsTrigger value="printers" className="shrink-0 px-4 min-h-10">{t("settings.tabs.printers")}</TabsTrigger> : null}
          {visibleTabs.includes("numbering") ? <TabsTrigger value="numbering" className="shrink-0 px-4 min-h-10">{t("settings.tabs.numbering")}</TabsTrigger> : null}
          {visibleTabs.includes("receipt") ? <TabsTrigger value="receipt" className="shrink-0 px-4 min-h-10">{t("settings.tabs.receipt")}</TabsTrigger> : null}
          {visibleTabs.includes("warehouses") ? <TabsTrigger value="warehouses" className="shrink-0 px-4 min-h-10">{t("settings.tabs.warehouses")}</TabsTrigger> : null}
          {visibleTabs.includes("banks") ? <TabsTrigger value="banks" className="shrink-0 px-4 min-h-10">{t("settings.tabs.banks")}</TabsTrigger> : null}
          {visibleTabs.includes("payments") ? <TabsTrigger value="payments" className="shrink-0 px-4 min-h-10">{t("settings.tabs.payments")}</TabsTrigger> : null}
          {visibleTabs.includes("system") ? <TabsTrigger value="system" className="shrink-0 px-4 min-h-10">{t("settings.tabs.system")}</TabsTrigger> : null}
          {visibleTabs.includes("integration") ? <TabsTrigger value="integration" className="shrink-0 px-4 min-h-10">{t("settings.tabs.integration")}</TabsTrigger> : null}
        </ScrollableTabsList>
        <TabsContent value="merchant" className="mt-4">{activeTab === "merchant" ? <MerchantSettings /> : null}</TabsContent>
        <TabsContent value="outlets" className="mt-4">{activeTab === "outlets" ? <OutletsSettings /> : null}</TabsContent>
        <TabsContent value="taxes" className="mt-4">{activeTab === "taxes" ? <TaxSettings /> : null}</TabsContent>
        <TabsContent value="printers" className="mt-4">{activeTab === "printers" ? <PrinterSettings /> : null}</TabsContent>
        <TabsContent value="payments" className="mt-4">
          {activeTab === "payments" ? <PaymentSettingsSectionTabs /> : null}
        </TabsContent>
        <TabsContent value="system" className="mt-4">{activeTab === "system" ? <SystemSettings /> : null}</TabsContent>
        <TabsContent value="integration" className="mt-4">{activeTab === "integration" ? <IntegrationSettings /> : null}</TabsContent>
        <TabsContent value="numbering" className="mt-4">{activeTab === "numbering" ? <NumberingSettings /> : null}</TabsContent>
        <TabsContent value="banks" className="mt-4">{activeTab === "banks" ? <BankSettings /> : null}</TabsContent>
        <TabsContent value="receipt" className="mt-4">{activeTab === "receipt" ? <ReceiptSettings /> : null}</TabsContent>
        <TabsContent value="warehouses" className="mt-4">{activeTab === "warehouses" ? <WarehouseSettings /> : null}</TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
