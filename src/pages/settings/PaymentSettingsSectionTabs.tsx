import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OutletPaymentSettingsPanel from "@/components/settings/OutletPaymentSettingsPanel";
import MasterPaymentMethodsPanel from "@/components/settings/MasterPaymentMethodsPanel";
import {
  DEFAULT_PAYMENT_SETTINGS_SECTION,
  resolvePaymentSettingsSection,
  settingsTabToUrlParam,
  type PaymentSettingsSection,
} from "./paymentSettingsSections";

export default function PaymentSettingsSectionTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSection = resolvePaymentSettingsSection(searchParams.get("section"));
  const [section, setSection] = useState<PaymentSettingsSection>(urlSection);

  useEffect(() => {
    setSection(urlSection);
  }, [urlSection]);

  const changeSection = (next: PaymentSettingsSection) => {
    setSection(next);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab", settingsTabToUrlParam("payments"));
      params.set("section", next);
      return params;
    });
  };

  return (
    <Tabs
      value={section}
      onValueChange={(value) => {
        if (value === "outlet" || value === "master") changeSection(value);
      }}
      className="w-full"
    >
      <TabsList aria-label="Payment settings sections" className="grid w-full max-w-xl grid-cols-2 h-auto">
        <TabsTrigger value="outlet" className="text-xs sm:text-sm whitespace-normal py-2">
          Outlet Payment Settings
        </TabsTrigger>
        <TabsTrigger value="master" className="text-xs sm:text-sm whitespace-normal py-2">
          Master Payment Methods
        </TabsTrigger>
      </TabsList>

      <TabsContent value="outlet" className="mt-4">
        <OutletPaymentSettingsPanel />
      </TabsContent>
      <TabsContent value="master" className="mt-4">
        <MasterPaymentMethodsPanel />
      </TabsContent>
    </Tabs>
  );
}

export { DEFAULT_PAYMENT_SETTINGS_SECTION };
